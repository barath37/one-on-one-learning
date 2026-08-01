# core/views.py
# ONE file: every endpoint + all LLM/TTS logic inlined (no separate llm_service.py).
# Replace core/views.py entirely with this. Gemini is gone — NVIDIA (+ local
# Ollama fallback) handles everything: storytelling, grading, classification,
# curriculum drafting, mermaid diagrams.
import os
import sys
import subprocess
import re
import json
import base64
import asyncio
import requests
from io import BytesIO

def get_nvidia_client_key():
    return os.getenv("NVIDIA_API_KEY", "")

NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from openai import OpenAI

from .models import (
    LearnerProfile, RelevanceLog, KnowledgeNode, MistakeLog, LessonLog,
    PrereqCheck, Track, CurriculumIteration, Module, Submodule,
)

# =====================================================================
# LLM CLIENTS — NVIDIA primary, Ollama local fallback. No Gemini anywhere.
# =====================================================================
NVIDIA_CLIENT = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY") or "not-set",
)
OLLAMA_CLIENT = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",
)


def _chat(prompt: str, max_tokens: int = 300) -> tuple[str, str]:
    """Every LLM call in this file goes through here. NVIDIA first, Ollama
    (local, always reachable) as fallback if NVIDIA times out/rate-limits/errors."""
    try:
        completion = NVIDIA_CLIENT.chat.completions.create(
            model="meta/llama-3.1-70b-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=max_tokens,
            timeout=10,
        )
        return completion.choices[0].message.content, "nvidia"
    except Exception:
        completion = OLLAMA_CLIENT.chat.completions.create(
            model="llama3.1:8b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=max_tokens,
            timeout=20,
        )
        return completion.choices[0].message.content, "ollama-fallback"


def build_persona_prompt(node_title: str, core_concept: str, profile: LearnerProfile, tactic: str) -> str:
    return f"""
You are the Primer, a master Gurukul guru teaching: {node_title}.
Core Logical Truth to deliver (DO NOT ALTER THIS LOGIC): {core_concept}

LEARNER PROFILE:
- Interests/domains: {profile.domain_of_interest}
- Mother tongue: {profile.mother_tongue or "unspecified"}
- Dialect: {profile.regional_dialect or "neutral"}
- Tone: {profile.current_persona_tone}
- Pacing: {profile.pacing_speed}

CURRENT TACTIC:
{tactic}

RULES:
1. Wrap the concept in a story from the learner's stated interests/domains.
2. Embody the tone and pacing exactly.
3. Keep it under 150 words, followed by exactly ONE interactive question.
"""


def classify_topic(text: str) -> str:
    """CHITCHAT / SIMPLE / COMPLEX. COMPLEX also covers cross-domain asks
    (e.g. 'IT grad learning CAD from Mech') and any 'learn X in depth' phrasing."""
    prompt = f"""
Classify this message into EXACTLY one word: CHITCHAT, SIMPLE, or COMPLEX.
- CHITCHAT: greetings/small talk, not a learning request (e.g. "hi", "thanks")
- SIMPLE: one small fact answerable directly (e.g. "capital of France")
- COMPLEX: a broad subject/skill worth a structured multi-module track, OR a
  cross-domain request (e.g. someone from one field learning a tool/skill from
  a totally different field), OR explicit "in depth"/"in detail" phrasing.
Message: "{text}"
Reply with just the one word.
"""
    raw, _ = _chat(prompt, max_tokens=5)
    label = raw.strip().upper()
    for c in ("CHITCHAT", "SIMPLE", "COMPLEX"):
        if c in label:
            return c
    return "COMPLEX"


def grade_answer(question_context: str, user_answer: str, core_concept: str) -> dict:
    """Lenient PASS/FAIL — partial/approximate understanding still passes."""
    prompt = f"""
Core concept: {core_concept}
Question/story context: {question_context}
Student's answer: {user_answer}
Did they show at least basic understanding? Be lenient. Reply EXACTLY as:
PASS - <short reason>   or   FAIL - <short reason>
"""
    raw, _ = _chat(prompt, max_tokens=60)
    raw = raw.strip()
    return {"passed": raw.upper().startswith("PASS"), "raw": raw}


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.strip().lower()).strip("_")[:100]


# =====================================================================
# ONBOARDING + PSYCHOMETRIC TEST (Day 1)
# =====================================================================
PSYCH_QUESTIONS = [
    "When you hit something confusing, do you prefer to re-read slowly or jump ahead and circle back?",
    "Do you learn better from a story/example first, or the formal rule first?",
    "How do you feel about making mistakes while learning — frustrating, or just part of it?",
    "Do you prefer short daily sessions or long deep-dive sessions?",
    "When stuck, do you prefer to be told the answer, or nudged toward it?",
]


@require_http_methods(["GET"])
def psych_questions_view(request):
    return JsonResponse({"questions": PSYCH_QUESTIONS})


@csrf_exempt
@require_http_methods(["POST"])
def onboard(request):
    """Day-1 profile. Every '...'-suffixed field accepts comma-separated multi-answers
    as plain text — simplest reliable way to support multiple answers per question."""
    data = json.loads(request.body)
    psych_answers = data.get("psych_answers", [])  # list of 5 free-text answers

    psych_score = 3
    assessed_learning_age = "unassessed"
    if psych_answers:
        eval_prompt = f"""
A learner answered a short behavioral questionnaire:
{json.dumps(list(zip(PSYCH_QUESTIONS, psych_answers)), indent=2)}
Based on this, output EXACTLY two lines:
SCORE: <a single integer 1-5, where 5 = very resilient/self-directed learner>
LEVEL: <one short phrase describing their learning maturity, e.g. "needs guided pacing">
"""
        raw, _ = _chat(eval_prompt, max_tokens=60)
        for line in raw.splitlines():
            if line.upper().startswith("SCORE:"):
                try:
                    psych_score = int(re.search(r"\d", line).group())
                except Exception:
                    pass
            elif line.upper().startswith("LEVEL:"):
                assessed_learning_age = line.split(":", 1)[1].strip()

    profile, _ = LearnerProfile.objects.update_or_create(
        user_id=data["user_id"],
        defaults={
            "stated_age": data.get("stated_age"),
            "prep_level": data.get("prep_level", "unassessed"),
            "domain_of_interest": data.get("domain", "general"),
            "mother_tongue": data.get("mother_tongue", ""),
            "birthplace": data.get("birthplace", ""),
            "residence": data.get("residence", ""),
            "languages_spoken": data.get("languages_spoken", data.get("mother_tongue", "")),
            "regional_dialect": data.get("mother_tongue", ""),
            "preferred_metaphor_domain": data.get("domain", "general"),
            "psych_score": psych_score,
            "psych_raw_answers": json.dumps(psych_answers),
            "assessed_learning_age": assessed_learning_age,
            "current_node_id": "",
        },
    )
    return JsonResponse({"user_id": profile.user_id, "psych_score": psych_score, "assessed_learning_age": assessed_learning_age})


# =====================================================================
# DAILY RELEVANCE / "TALK OF THE TOWN" (once per day, includes an
# irrelevant/off-track check question)
# =====================================================================
@require_http_methods(["GET"])
def relevance_status(request, learner_id):
    profile = LearnerProfile.objects.get(user_id=learner_id)
    needed = profile.last_icebreaker_at != timezone.localdate()
    return JsonResponse({"needed": needed})


@require_http_methods(["GET"])
def relevance_questions(request, learner_id):
    profile = LearnerProfile.objects.get(user_id=learner_id)
    prompt = f"""
Learner's interests: {profile.domain_of_interest}. Current mood/context unknown.
Generate exactly two short casual check-in questions, EXACTLY in this format:
RELEVANT: <a casual 'talk of the town' question tied to their interests, like a
  real tutor making small talk before a session>
IRRELEVANT: <a short, clearly unrelated question used only to check the learner
  is paying attention/on track today, e.g. asking them to name today's weather
  or repeat a random word>
"""
    raw, _ = _chat(prompt, max_tokens=80)
    relevant_q, irrelevant_q = "How's your day going?", "What's one word to describe right now?"
    for line in raw.splitlines():
        if line.upper().startswith("RELEVANT:"):
            relevant_q = line.split(":", 1)[1].strip()
        elif line.upper().startswith("IRRELEVANT:"):
            irrelevant_q = line.split(":", 1)[1].strip()
    return JsonResponse({"relevant_question": relevant_q, "irrelevant_question": irrelevant_q})


@csrf_exempt
@require_http_methods(["POST"])
def relevance_submit(request, learner_id):
    profile = LearnerProfile.objects.get(user_id=learner_id)
    today = timezone.localdate()
    if profile.last_icebreaker_at == today:
        return JsonResponse({"updated": False, "reason": "already done today"}, status=409)

    data = json.loads(request.body)
    relevant_q = data.get("relevant_question", "")
    relevant_a = data.get("relevant_answer", "")
    irrelevant_q = data.get("irrelevant_question", "")
    irrelevant_a = data.get("irrelevant_answer", "")

    extract_prompt = f"""
Relevant Q: {relevant_q}
Relevant A: {relevant_a}
Irrelevant Q (attention check): {irrelevant_q}
Irrelevant A: {irrelevant_a}
Reply EXACTLY in this format:
INTEREST: <short 2-5 word updated micro-interest from the relevant answer>
ON_TRACK: <YES or NO — NO only if the irrelevant answer suggests they're not
  actually paying attention / answer is nonsensical/empty>
"""
    raw, _ = _chat(extract_prompt, max_tokens=40)
    interest, on_track = "general", True
    for line in raw.splitlines():
        if line.upper().startswith("INTEREST:"):
            interest = line.split(":", 1)[1].strip()
        elif line.upper().startswith("ON_TRACK:"):
            on_track = "YES" in line.upper()

    RelevanceLog.objects.create(
        learner=profile, relevant_question=relevant_q, relevant_answer=relevant_a,
        irrelevant_question=irrelevant_q, irrelevant_answer=irrelevant_a,
        extracted_interest=interest, on_track=on_track,
    )
    profile.domain_of_interest = interest
    profile.preferred_metaphor_domain = interest
    profile.last_icebreaker_at = today
    profile.save()
    return JsonResponse({"updated": True, "new_interest": interest, "on_track": on_track})


# =====================================================================
# CLASSIFY -> PREREQ CHECK -> DIRECT LESSON or ESCALATE TO TRACK
# =====================================================================
@csrf_exempt
@require_http_methods(["POST"])
def classify_topic_view(request):
    data = json.loads(request.body)
    text = data.get("text", "").strip()
    if not text:
        return JsonResponse({"label": "CHITCHAT"})
    try:
        label = classify_topic(text)
    except Exception:
        label = "COMPLEX"
    return JsonResponse({"label": label})


@csrf_exempt
@require_http_methods(["POST"])
def prereq_questions_view(request, learner_id):
    """For a SIMPLE topic: generate 3+ prerequisite-check questions before teaching."""
    data = json.loads(request.body)
    topic = data["topic"]
    prompt = f"""
A learner wants to learn: "{topic}"
Generate exactly 3 short prerequisite-check questions to confirm they have the
foundational knowledge needed. Reply as a numbered list, one question per line,
nothing else.
"""
    raw, _ = _chat(prompt, max_tokens=150)
    questions = [re.sub(r"^\d+[\.\)]\s*", "", l).strip() for l in raw.splitlines() if l.strip()][:3]
    profile = LearnerProfile.objects.get(user_id=learner_id)
    check = PrereqCheck.objects.create(learner=profile, topic=topic, questions_json=json.dumps(questions))
    return JsonResponse({"check_id": check.id, "questions": questions})


@csrf_exempt
@require_http_methods(["POST"])
def prereq_evaluate_view(request, learner_id):
    """Grades the 3 answers. Pass >=2/3 -> teach directly. Otherwise (including
    any cross-domain mismatch) -> auto-escalate into a real Track."""
    data = json.loads(request.body)
    check = PrereqCheck.objects.get(id=data["check_id"])
    answers = data["answers"]  # list of 3 strings
    questions = json.loads(check.questions_json)

    pass_count = 0
    for q, a in zip(questions, answers):
        result = grade_answer(q, a, check.topic)
        if result["passed"]:
            pass_count += 1
    check.answers_json = json.dumps(answers)
    check.pass_count = pass_count
    check.save()

    if pass_count >= 2:
        return JsonResponse({"escalate": False, "pass_count": pass_count})

    # Escalate: auto-draft + auto-finalize a track for this topic, no extra user input needed
    profile = check.learner
    draft_prompt = f"""
Learner struggled with prerequisites for: "{check.topic}"
Draft a structured curriculum to build them up to it properly. Respond in
markdown with EXACTLY this structure:
# <Curriculum Title>
## Overview
<2-3 sentences>
## Learning Objectives
<bulleted list>
## Curriculum Tree
### Module 1: <title>
- <submodule title>
- <submodule title>
### Module 2: <title>
- <submodule title>
Keep it to 2-3 modules, 2-3 submodules each, starting from the missing foundation.
"""
    response_text, _ = _chat(draft_prompt, max_tokens=400)
    track = _finalize_markdown_into_track(profile, check.topic, response_text)
    check.escalated_to_track = track
    check.save()
    return JsonResponse({"escalate": True, "pass_count": pass_count, "track_id": track.id, "track_title": track.title})


# =====================================================================
# SIMPLE TOPIC — DIRECT TEACH (after passing prereqs), with implicit/explicit
# no-retry prerequisite fallback, same as before
# =====================================================================
@require_http_methods(["GET"])
def get_lesson(request, learner_id):
    profile = LearnerProfile.objects.get(user_id=learner_id)
    topic = request.GET.get("topic")

    if topic:
        node, _ = KnowledgeNode.objects.get_or_create(
            node_id=f"topic_{_slugify(topic)}",
            defaults={"title": topic, "core_concept": f"The fundamental principles of {topic}."},
        )
        profile.current_node_id = node.node_id
        profile.save()
    else:
        node = KnowledgeNode.objects.get(node_id=profile.current_node_id)

    tactic = "Introduce the concept normally."
    prerequisite_node = None
    if profile.frustration_score == 1:
        if not node.prerequisite_node_id:
            derive_prompt = f"""
Student struggling with: {node.title} ({node.core_concept})
Name ONE foundational prerequisite concept, EXACTLY as:
TITLE: <2-5 words>
EXPLANATION: <one sentence>
"""
            raw, _ = _chat(derive_prompt, max_tokens=60)
            title, explanation = "Foundational concept", f"Underlies {node.title}."
            for line in raw.splitlines():
                if line.upper().startswith("TITLE:"):
                    title = line.split(":", 1)[1].strip()
                elif line.upper().startswith("EXPLANATION:"):
                    explanation = line.split(":", 1)[1].strip()
            prereq_id = f"prereq_{node.node_id}"
            KnowledgeNode.objects.get_or_create(node_id=prereq_id, defaults={"title": title, "core_concept": explanation})
            node.prerequisite_node_id = prereq_id
            node.save()
        prerequisite_node = KnowledgeNode.objects.filter(node_id=node.prerequisite_node_id).first()
        if prerequisite_node:
            tactic = f"""IMPLICIT REPAIR (do not reveal this): weave in this
underlying idea first, disguised as part of the same story, never naming it:
{prerequisite_node.core_concept}"""

    try:
        prompt = build_persona_prompt(node.title, node.core_concept, profile, tactic)
        lesson_text, source = _chat(prompt)
    except Exception as exc:
        return JsonResponse({"error": "Lesson generation failed on both NVIDIA and Ollama.", "detail": str(exc)}, status=502)

    mode = "implicit-repair" if prerequisite_node else "normal"
    LessonLog.objects.create(learner=profile, node_id=node.node_id, title=node.title, mode=mode)
    return JsonResponse({"node_id": node.node_id, "title": node.title, "lesson_text": lesson_text, "source": source, "mode": mode})


@csrf_exempt
@require_http_methods(["POST"])
def evaluate_answer(request, learner_id):
    data = json.loads(request.body)
    user_answer, lesson_text = data["answer"], data["lesson_text"]
    profile = LearnerProfile.objects.get(user_id=learner_id)
    node = KnowledgeNode.objects.get(node_id=profile.current_node_id)

    grade = grade_answer(lesson_text, user_answer, node.core_concept)
    message = None
    if grade["passed"]:
        profile.frustration_score = 0
        profile.current_persona_tone = "excited"
        profile.pacing_speed = "fast and challenging"
        if node.next_node_id:
            profile.current_node_id = node.next_node_id
    else:
        profile.frustration_score += 1
        profile.current_persona_tone = "gentle and apologetic"
        MistakeLog.objects.create(
            learner=profile, node_id=node.node_id, user_answer=user_answer,
            ai_feedback=grade["raw"], fallback_node_id=node.prerequisite_node_id or "",
        )
        if profile.frustration_score >= 2 and node.prerequisite_node_id:
            profile.current_node_id = node.prerequisite_node_id
            profile.frustration_score = 0
            message = f"Let's pause {node.title} and make sure the foundation is solid first."
    profile.save()

    last_log = LessonLog.objects.filter(learner=profile, node_id=node.node_id).order_by("-created_at").first()
    if last_log:
        last_log.user_answer = user_answer
        last_log.passed = grade["passed"]
        last_log.save()

    return JsonResponse({
        "passed": grade["passed"], "feedback": grade["raw"],
        "next_node": profile.current_node_id, "frustration_score": profile.frustration_score,
        "message": message,
    })


# =====================================================================
# COMPLEX TOPIC — ITERATIVE CURRICULUM CURATION -> TRACK/MODULE/SUBMODULE
# =====================================================================
def _finalize_markdown_into_track(profile, source_topic, response_text) -> Track:
    lines = response_text.splitlines()
    title = next((l.lstrip("# ").strip() for l in lines if l.startswith("# ")), source_topic)
    track = Track.objects.create(learner=profile, title=title, source_topic=source_topic)

    module, module_order, sub_order = None, 0, 0
    for line in lines:
        if line.startswith("### Module") or line.startswith("###"):
            module_order += 1
            module_title = line.split(":", 1)[-1].strip() if ":" in line else line.lstrip("# ").strip()
            module = Module.objects.create(track=track, order=module_order, title=module_title)
            sub_order = 0
        elif line.strip().startswith("-") and module:
            sub_order += 1
            Submodule.objects.create(module=module, order=sub_order, title=line.strip().lstrip("- ").strip())
    return track


@csrf_exempt
@require_http_methods(["POST"])
def curriculum_iterate(request, learner_id):
    profile = LearnerProfile.objects.get(user_id=learner_id)
    data = json.loads(request.body)
    prompt_text, track_id = data["prompt"], data.get("track_id")

    prior_context = ""
    if track_id:
        prior = CurriculumIteration.objects.filter(track_id=track_id).order_by("-created_at").first()
        if prior:
            prior_context = f"\nPrevious draft:\n{prior.response_text}\n\nRefinement: {prompt_text}"

    drafting_prompt = f"""
Draft a structured curriculum. Learner request: {prompt_text}{prior_context}
Respond in markdown EXACTLY as:
# <Curriculum Title>
## Overview
<2-3 sentences>
## Learning Objectives
<bulleted list>
## Curriculum Tree
### Module 1: <title>
- <submodule title>
- <submodule title>
### Module 2: <title>
- <submodule title>
Keep it to 2-4 modules, 2-4 submodules each.
"""
    response_text, _ = _chat(drafting_prompt, max_tokens=500)
    track = Track.objects.get(id=track_id) if track_id else None
    iteration = CurriculumIteration.objects.create(learner=profile, track=track, prompt_text=prompt_text, response_text=response_text)
    return JsonResponse({"iteration_id": iteration.id, "response": response_text})


@csrf_exempt
@require_http_methods(["POST"])
def curriculum_finalize(request, learner_id):
    profile = LearnerProfile.objects.get(user_id=learner_id)
    data = json.loads(request.body)
    iteration = CurriculumIteration.objects.get(id=data["iteration_id"])
    iteration.is_selected = True

    track = _finalize_markdown_into_track(profile, iteration.prompt_text, iteration.response_text)
    iteration.track = track
    iteration.save()
    return JsonResponse({"track_id": track.id, "title": track.title})


@require_http_methods(["GET"])
def list_tracks(request, learner_id):
    tracks = Track.objects.filter(learner__user_id=learner_id).order_by("-created_at")
    return JsonResponse({"tracks": [{"id": t.id, "title": t.title, "source_topic": t.source_topic} for t in tracks]})


@require_http_methods(["GET"])
def track_modules(request, track_id):
    track = Track.objects.get(id=track_id)
    modules = [{
        "id": m.id, "order": m.order, "title": m.title,
        "submodules": [
            {"id": s.id, "order": s.order, "title": s.title,
             "assignment_done": s.assignment_done, "research_done": s.research_done}
            for s in m.submodules.all()
        ],
    } for m in track.modules.all()]
    return JsonResponse({"track_title": track.title, "modules": modules})


@require_http_methods(["GET"])
def submodule_detail(request, submodule_id):
    """Generates learning_material + Mermaid diagram on demand, and an
    application-based assignment prompt, matching the reference UI."""
    sub = Submodule.objects.get(id=submodule_id)
    if not sub.learning_material:
        prompt = f"""
Write learning material for: {sub.module.track.title} > {sub.module.title} > {sub.title}
Explain clearly with an example. Then on a new line output a small Mermaid.js
flowchart (5-8 nodes) of the core logic, wrapped in a ```mermaid fence. Then
after that, on a new line write "ASSIGNMENT:" followed by one short
application-based task for the learner to attempt (not multiple choice).
"""
        content, _ = _chat(prompt, max_tokens=500)
        material, diagram, assignment = content, "", "Apply what you just learned to a small example of your own."
        if "```mermaid" in content:
            material, _, rest = content.partition("```mermaid")
            diagram, _, rest = rest.partition("```")
            content = rest
        if "ASSIGNMENT:" in content:
            _, _, assignment = content.partition("ASSIGNMENT:")
        sub.learning_material = material.strip()
        sub.mermaid_diagram = diagram.strip()
        sub.assignment_prompt = assignment.strip()
        sub.save()

    return JsonResponse({
        "title": sub.title, "learning_material": sub.learning_material,
        "mermaid_diagram": sub.mermaid_diagram, "assignment_prompt": sub.assignment_prompt,
        "assignment_done": sub.assignment_done, "research_done": sub.research_done,
    })


@csrf_exempt
@require_http_methods(["POST"])
def submodule_submit_assignment(request, submodule_id):
    """Same no-retry philosophy as the simple-topic flow, scoped per submodule."""
    sub = Submodule.objects.get(id=submodule_id)
    data = json.loads(request.body)
    answer = data["answer"]
    grade = grade_answer(sub.assignment_prompt, answer, sub.learning_material[:300])
    sub.assignment_answer = answer
    if grade["passed"]:
        sub.assignment_done = True
        sub.frustration_score = 0
    else:
        sub.frustration_score += 1
    sub.save()
    return JsonResponse({"passed": grade["passed"], "feedback": grade["raw"], "frustration_score": sub.frustration_score})


# =====================================================================
# HISTORY / LIBRARY
# =====================================================================
@require_http_methods(["GET"])
def mistake_history(request, learner_id):
    rows = MistakeLog.objects.filter(learner__user_id=learner_id).order_by("-created_at")
    return JsonResponse({"mistakes": [
        {"node_id": m.node_id, "user_answer": m.user_answer, "ai_feedback": m.ai_feedback,
         "fallback_node_id": m.fallback_node_id, "created_at": m.created_at.isoformat()}
        for m in rows
    ]})


@require_http_methods(["GET"])
def topics_explored(request, learner_id):
    rows = LessonLog.objects.filter(learner__user_id=learner_id).order_by("-created_at")
    seen, topics = set(), []
    for row in rows:
        if row.node_id in seen:
            continue
        seen.add(row.node_id)
        topics.append({"node_id": row.node_id, "title": row.title, "last_seen": row.created_at.isoformat()})
    return JsonResponse({"topics": topics})


# =====================================================================
# TEXT-TO-SPEECH — edge-tts (emotional/natural, regional-accent voices),
# replacing gTTS entirely
# =====================================================================
async def _edge_tts_generate(text: str, voice: str) -> bytes:
    import edge_tts
    communicate = edge_tts.Communicate(text, voice)
    chunks = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
    return b"".join(chunks)


@csrf_exempt
@require_http_methods(["POST"])
def text_to_speech(request):
    data = json.loads(request.body)
    text = data.get("text", "").strip()
    voice = data.get("voice", "en-IN-NeerjaNeural")  # Indian-accented English, natural prosody
    if not text:
        return JsonResponse({"error": "No text provided"}, status=400)
    try:
        audio_bytes = asyncio.run(_edge_tts_generate(text, voice))
        return JsonResponse({"audio_base64": base64.b64encode(audio_bytes).decode("utf-8")})
    except Exception as exc:
        return JsonResponse({"error": f"TTS failed: {exc}"}, status=502)


# =====================================================================
# VOICE RECOGNITION — STUB. Real STT needs a dedicated model/API; this
# endpoint exists so the frontend has something to call, but it just
# echoes back that browser-side Web Speech API should be used instead.
# =====================================================================
@csrf_exempt
@require_http_methods(["POST"])
def voice_recognition_stub(request):
    return JsonResponse({
        "implemented": False,
        "note": "Use the browser's built-in Web Speech API (SpeechRecognition) client-side for now — server-side STT is not wired up.",
    })


# =====================================================================
# OCR / FILE ATTACHMENTS — explicitly deferred, per your own prioritization.
# Stub only, so the route exists for later.
# =====================================================================
@csrf_exempt
@require_http_methods(["POST"])
def ocr_stub(request):
    return JsonResponse({"implemented": False, "note": "OCR/file attachments deferred — not built yet."})


@csrf_exempt
@require_http_methods(["POST"])
def launch_cv_demo(request):
    """Launches the OpenCV AR script in a new local window"""
    try:
        subprocess.Popen([sys.executable, "cv_demo/main.py"])
        return JsonResponse({"launched": True})
    except Exception as exc:
        return JsonResponse({"launched": False, "error": str(exc)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def whiteboard_ask(request):
    """Analyzes student whiteboard drawings using NVIDIA Vision"""
    try:
        data = json.loads(request.body)
        img_b64 = data.get("image_base64", "")
        
        api_key = get_nvidia_client_key()
        if api_key:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "meta/llama-3.2-11b-vision-instruct",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "The student drew this on a digital whiteboard to ask a question. Analyze what they drew and answer their question clearly and concisely."},
                            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}}
                        ]
                    }
                ],
                "temperature": 0.2,
                "max_tokens": 512
            }
            try:
                response = requests.post(NVIDIA_API_URL, headers=headers, json=payload, timeout=30)
                if response.status_code == 200:
                    res_data = response.json()
                    reply = res_data["choices"][0]["message"]["content"].strip()
                    return JsonResponse({"reply": reply})
            except Exception as e:
                print(f"Vision API call failed, falling back: {e}")

        # Fallback explanation if key missing or Vision API call fails
        reply, _ = _chat("The student drew a diagram or math/physics question on their whiteboard. Explain the core concept behind drawings, equations, and diagrams step-by-step.")
        return JsonResponse({"reply": reply})
    except Exception as exc:
        return JsonResponse({"error": f"Vision analysis failed: {str(exc)}"}, status=500)


