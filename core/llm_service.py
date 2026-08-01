# core/llm_service.py
import os
from openai import OpenAI
from google import genai

NVIDIA_CLIENT = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ["NVIDIA_API_KEY"],
)
OLLAMA_CLIENT = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",
)
GEMINI_CLIENT = genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def _chat(prompt: str, max_tokens: int = 250) -> tuple[str, str]:
    """Shared NVIDIA -> Ollama fallback call. Used for both lesson generation
    and icebreaker extraction so there's one place that owns the fallback logic."""
    try:
        completion = NVIDIA_CLIENT.chat.completions.create(
            model="meta/llama-3.1-70b-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=max_tokens,
            timeout=8,
        )
        return completion.choices[0].message.content, "nvidia"
    except Exception:
        completion = OLLAMA_CLIENT.chat.completions.create(
            model="llama3.1:8b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=max_tokens,
            timeout=15,  # local model on CPU can be slow but shouldn't hang forever
        )
        return completion.choices[0].message.content, "ollama-fallback"


def build_system_prompt(node, profile, prerequisite_node=None) -> str:
    """Explicit vs. implicit routing lives here:
    - frustration_score == 1  -> IMPLICIT: teach the current node, secretly folding
      in the prerequisite concept, never naming it or changing what's shown as "current".
    - frustration_score >= 2  -> handled in views.evaluate_answer by actually
      switching current_node_id — at that point this function is just called
      again normally for the (now-prerequisite) node, no special tactic needed.
    """
    if profile.frustration_score == 1 and prerequisite_node:
        tactic = f"""
IMPLICIT REPAIR MODE (do not reveal this to the learner): they are struggling with
{node.title} but the real gap is the foundation underneath it. Teach {node.title}
as requested, but weave in this underlying idea first, disguised as part of the
same story: {prerequisite_node.core_concept}
Never say the words "{prerequisite_node.title}" or imply they've been moved back a
level — it should feel like one continuous, slightly more detailed explanation.
"""
    else:
        tactic = "Introduce the concept normally using the learner's domain of interest."

    return f"""
You are the Primer, a master Gurukul guru teaching: {node.title}.
Core Logical Truth to deliver (DO NOT ALTER THIS LOGIC): {node.core_concept}

LEARNER PROFILE:
- Domain of interest: {profile.preferred_metaphor_domain}
- Inspiration/hero: {profile.inspiration or "none given"}
- Actively avoid: {profile.study_dislikes or "nothing specific"}
- Tone: {profile.current_persona_tone}
- Pacing: {profile.pacing_speed}
- Dialect: {profile.regional_dialect}. STRICT RULE: YOU MUST STRICTLY AVOID USAGE OF NATIVE REGIONAL SCRIPT (e.g. no Tamil letters). You may use Tanglish (regional words typed in English alphabet) combined with English.
CURRENT TACTIC:
{tactic}

RULES:
1. Wrap the concept in a story from the domain of interest; use the inspiration
   figure as a mentor or character in it if it fits naturally.
2. Never explain using anything from the "actively avoid" list.
3. Embody the tone exactly.
4. Keep it under 150 words, followed by exactly ONE interactive question.
"""


def generate_story(system_prompt: str) -> tuple[str, str]:
    return _chat(system_prompt, max_tokens=250)


def extract_interest_from_icebreaker(user_reply: str) -> tuple[str, str]:
    """The 'Talk of the Town' extractor — turns a casual daily reply into a
    micro-interest string used to update domain_of_interest."""
    prompt = f"""
Extract the user's current micro-interest and mood from this text. Respond in
EXACTLY this format, nothing else:
INTEREST: <a short 2-5 word phrase>
MOOD: <one word>

Text: "{user_reply}"
"""
    raw, source = _chat(prompt, max_tokens=40)
    interest = "general"
    for line in raw.splitlines():
        if line.upper().startswith("INTEREST:"):
            interest = line.split(":", 1)[1].strip()
    return interest, source


def derive_and_link_prerequisite(node) -> None:
    """Asks the LLM for the single foundational concept underneath `node`, creates
    a KnowledgeNode for it if it doesn't exist, and links it via node.prerequisite_node_id.
    Runs once per node — after the first call it's a plain DB lookup, not another
    LLM round-trip. This is what makes the implicit/explicit fallback work for
    freeform topics too, not just the pre-seeded math/stats chains."""
    from .models import KnowledgeNode  # local import, avoids a circular import at module load

    prompt = f"""
A student is struggling with: {node.title} ({node.core_concept})
Name ONE single foundational prerequisite concept they likely need first, and
explain it in one sentence. Respond in EXACTLY this format, nothing else:
TITLE: <2-5 word concept name>
EXPLANATION: <one sentence, the ground-truth logic of that concept>
"""
    raw, _source = _chat(prompt, max_tokens=80)
    title, explanation = "Foundational concept", f"A foundational idea underlying {node.title}."
    for line in raw.splitlines():
        if line.upper().startswith("TITLE:"):
            title = line.split(":", 1)[1].strip()
        elif line.upper().startswith("EXPLANATION:"):
            explanation = line.split(":", 1)[1].strip()

    prereq_id = f"prereq_{node.node_id}"
    KnowledgeNode.objects.get_or_create(
        node_id=prereq_id,
        defaults=dict(title=title, core_concept=explanation),
    )
    node.prerequisite_node_id = prereq_id
    node.save()


def grade_answer(lesson_text: str, user_answer: str, core_concept: str) -> dict:
    grader_prompt = f"""
The teacher asked this question embedded in a story: {lesson_text}
The student answered: {user_answer}
Did the student understand the core concept of {core_concept}?
Reply strictly with 'PASS' or 'FAIL', followed by a 1-sentence reason.
"""
    try:
        result = GEMINI_CLIENT.models.generate_content(
            model="gemini-1.5-flash",
            contents=grader_prompt,
            config={"http_options": {"timeout": 8000}},  # ms — never let a blocked network hang the whole server
        )
        text = result.text.strip()
        return {"passed": text.upper().startswith("PASS"), "raw": text}
    except Exception as exc:
        # Gemini unreachable (network-blocked, rate-limited, etc.) — don't hang
        # the request or crash the view; be honest that grading didn't actually run.
        return {"passed": False, "raw": f"Grading unavailable right now ({exc.__class__.__name__}) — network to Gemini may be blocked on this connection."}