# core/views.py
import json
import re
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import LearnerProfile, KnowledgeNode, MistakeLog, LessonLog
from .llm_service import (
    build_system_prompt, generate_story, grade_answer,
    extract_interest_from_icebreaker, derive_and_link_prerequisite,
)


@csrf_exempt
@require_http_methods(["POST"])
def onboard(request):
    """Field mapping, matched to what the onboarding form actually asks:
    domain      -> domain_of_interest / preferred_metaphor_domain (what they love)
    dialect     -> regional_dialect (location & languages, raw as typed)
    prep_level  -> assessed_learning_age (self-reported skill level, stand-in
                   until a real psychometric-test model exists)
    psych_score -> psych_score (the 1-5 learning-behavior slider)
    inspiration / dislikes are accepted too, for whenever the form collects them."""
    data = json.loads(request.body)
    profile, _ = LearnerProfile.objects.update_or_create(
        user_id=data["user_id"],
        defaults={
            "stated_age": data.get("stated_age"),
            "domain_of_interest": data.get("domain", "general"),
            "preferred_metaphor_domain": data.get("domain", "Panchatantra animals"),
            "regional_dialect": data.get("dialect", "Kongu Tamil"),
            "mother_tongue": data.get("mother_tongue", ""),
            "birthplace": data.get("birthplace", ""),
            "residence": data.get("residence", ""),
            "assessed_learning_age": data.get("prep_level", "unassessed"),
            "psych_score": data.get("psych_score", 3),
            "inspiration": data.get("inspiration", ""),
            "study_dislikes": data.get("dislikes", ""),
            "current_node_id": data.get("start_node_id", "math_addition"),
        },
    )
    return JsonResponse({"user_id": profile.user_id, "current_node_id": profile.current_node_id})


@require_http_methods(["GET"])
def icebreaker_status(request, learner_id):
    """Frontend calls this on login to decide whether to show the icebreaker modal."""
    profile = LearnerProfile.objects.get(user_id=learner_id)
    already_done = profile.last_icebreaker_at == timezone.localdate()
    return JsonResponse({"needed": not already_done})


@csrf_exempt
@require_http_methods(["POST"])
def icebreaker_submit(request, learner_id):
    """Once-per-day cap enforced here, not just in the UI — a replayed/duplicate
    request on the same day is rejected rather than silently re-running."""
    profile = LearnerProfile.objects.get(user_id=learner_id)
    today = timezone.localdate()
    if profile.last_icebreaker_at == today:
        return JsonResponse({"updated": False, "reason": "already done today"}, status=409)

    data = json.loads(request.body)
    interest, source = extract_interest_from_icebreaker(data["reply"])

    profile.domain_of_interest = interest
    profile.preferred_metaphor_domain = interest
    profile.last_icebreaker_at = today
    profile.save()
    return JsonResponse({"updated": True, "new_domain": interest, "source": source})


def _slugify_topic(topic: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", topic.strip().lower()).strip("_")
    return f"topic_{slug[:80]}"


@require_http_methods(["GET"])
def get_lesson(request, learner_id):
    """IMPORTANT: whatever node this ends up teaching becomes profile.current_node_id,
    and stays a real KnowledgeNode row — not a throwaway object. That's what keeps
    evaluate_answer() grading against the SAME topic that was just taught, instead
    of silently grading against whatever current_node_id was left over from before."""
    try:
        profile = LearnerProfile.objects.get(user_id=learner_id)
    except LearnerProfile.DoesNotExist:
        return JsonResponse({"error": f"No learner profile for '{learner_id}' — onboarding hasn't run yet."}, status=404)

    requested_topic = request.GET.get("topic")

    if requested_topic:
        node, _created = KnowledgeNode.objects.get_or_create(
            node_id=_slugify_topic(requested_topic),
            defaults=dict(
                title=requested_topic,
                core_concept=f"The fundamental principles and mechanics of {requested_topic}.",
            ),
        )
        profile.current_node_id = node.node_id
        profile.save()
    else:
        node = KnowledgeNode.objects.get(node_id=profile.current_node_id)

    prerequisite_node = None
    if profile.frustration_score == 1:
        if not node.prerequisite_node_id:
            try:
                derive_and_link_prerequisite(node)
                node.refresh_from_db()
            except Exception:
                pass  # if this fails, just teach the node normally rather than crashing the whole lesson
        if node.prerequisite_node_id:
            prerequisite_node = KnowledgeNode.objects.filter(node_id=node.prerequisite_node_id).first()

    try:
        system_prompt = build_system_prompt(node, profile, prerequisite_node=prerequisite_node)
        lesson_text, source = generate_story(system_prompt)
    except Exception as exc:
        # Both NVIDIA and Ollama failed. Surface this as JSON the frontend can
        # actually show the user, instead of a raw Django 500/HTML crash page.
        return JsonResponse({
            "error": "Lesson generation failed on both NVIDIA and the local Ollama fallback.",
            "detail": str(exc),
        }, status=502)

    mode = "implicit-repair" if prerequisite_node else "normal"
    LessonLog.objects.create(learner=profile, node_id=node.node_id, title=node.title, mode=mode)

    return JsonResponse({
        "node_id": node.node_id,
        "title": node.title,
        "lesson_text": lesson_text,
        "source": source,
        "mode": mode,
    })


@require_http_methods(["GET"])
def topics_explored(request, learner_id):
    """Powers the Library page — distinct topics this learner has actually been taught."""
    rows = (LessonLog.objects
            .filter(learner__user_id=learner_id)
            .order_by("-created_at"))
    seen = set()
    topics = []
    for row in rows:
        if row.node_id in seen:
            continue
        seen.add(row.node_id)
        topics.append({"node_id": row.node_id, "title": row.title, "last_seen": row.created_at.isoformat()})
    return JsonResponse({"topics": topics})

@csrf_exempt
@require_http_methods(["POST"])
def evaluate_answer(request, learner_id):
    data = json.loads(request.body)
    user_answer = data["answer"]
    lesson_text = data["lesson_text"]

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
            learner=profile, node_id=node.node_id,
            user_answer=user_answer, ai_feedback=grade["raw"],
            fallback_node_id=node.prerequisite_node_id or "",
        )
        if profile.frustration_score == 1:
            # Implicit mode: don't move the node, next get_lesson call will
            # silently fold in the prerequisite via build_system_prompt.
            message = None
        elif profile.frustration_score >= 2 and node.prerequisite_node_id:
            # Explicit step-back: now we actually move and say so.
            profile.current_node_id = node.prerequisite_node_id
            profile.frustration_score = 0  # reset once we've actually repositioned
            message = f"Let's pause {node.title} and make sure {KnowledgeNode.objects.get(node_id=node.prerequisite_node_id).title} is solid first."

    profile.save()

    # Log this answer against the most recent lesson delivered for this node —
    # covers BOTH pass and fail, not just mistakes, so every prompt's context is stored.
    last_log = LessonLog.objects.filter(learner=profile, node_id=node.node_id).order_by("-created_at").first()
    if last_log:
        last_log.user_answer = user_answer
        last_log.passed = grade["passed"]
        last_log.save()

    return JsonResponse({
        "passed": grade["passed"],
        "feedback": grade["raw"],
        "next_node": profile.current_node_id,
        "frustration_score": profile.frustration_score,
        "message": message,
    })


@require_http_methods(["GET"])
def mistake_history(request, learner_id):
    rows = MistakeLog.objects.filter(learner__user_id=learner_id).order_by("-created_at")
    return JsonResponse({"mistakes": [
        {
            "node_id": m.node_id,
            "user_answer": m.user_answer,
            "ai_feedback": m.ai_feedback,
            "fallback_node_id": m.fallback_node_id,
            "created_at": m.created_at.isoformat(),
        } for m in rows
    ]})