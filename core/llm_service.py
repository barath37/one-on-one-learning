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


def grade_answer(lesson_text: str, user_answer: str, core_concept: str) -> dict:
    grader_prompt = f"""
The teacher asked this question embedded in a story: {lesson_text}
The student answered: {user_answer}
Did the student understand the core concept of {core_concept}?
Reply strictly with 'PASS' or 'FAIL', followed by a 1-sentence reason.
"""
    result = GEMINI_CLIENT.models.generate_content(
        model="gemini-1.5-flash",  # confirmed working — 2.5-flash 404s for new API keys
        contents=grader_prompt,
    )
    text = result.text.strip()
    return {"passed": text.upper().startswith("PASS"), "raw": text}