# core/llm_service.py
import os
from openai import OpenAI
from google import genai

NVIDIA_CLIENT = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ["NVIDIA_API_KEY"],
)
OLLAMA_CLIENT = OpenAI(
    base_url="http://localhost:11434/v1",  # Ollama's OpenAI-compatible endpoint
    api_key="ollama",  # required by the client, unused by Ollama
)
GEMINI_CLIENT = genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def build_system_prompt(node, profile) -> str:
    return f"""
You are the Primer, a master Gurukul guru teaching: {node.title}.
Core Logical Truth to deliver (DO NOT ALTER THIS LOGIC): {node.core_concept}

LEARNER PROFILE:
- Domain of interest: {profile.preferred_metaphor_domain}
- Inspiration/hero: {profile.inspiration or "none given"}
- Actively avoid: {profile.study_dislikes or "nothing specific"}
- Tone: {profile.current_persona_tone}
- Pacing: {profile.pacing_speed}
- Dialect: {profile.regional_dialect} ({profile.target_language})

RULES:
1. Wrap the concept in a story from the domain of interest; use the inspiration
   figure as a mentor or character in it if it fits naturally.
2. Never explain using anything from the "actively avoid" list.
3. Embody the tone exactly.
4. Keep it under 150 words, followed by exactly ONE interactive question.
"""


def generate_story(system_prompt: str) -> tuple[str, str]:
    """NVIDIA first. Falls back to local Ollama on timeout/rate-limit/outage.
    Returns (lesson_text, source) — log the source so you can show the fallback
    actually fired if you need to during the demo."""
    try:
        completion = NVIDIA_CLIENT.chat.completions.create(
            model="meta/llama-3.1-70b-instruct",
            messages=[{"role": "user", "content": system_prompt}],
            temperature=0.7,
            max_tokens=250,
            timeout=8,
        )
        return completion.choices[0].message.content, "nvidia"
    except Exception:
        completion = OLLAMA_CLIENT.chat.completions.create(
            model="llama3.1:8b",
            messages=[{"role": "user", "content": system_prompt}],
            temperature=0.7,
            max_tokens=250,
        )
        return completion.choices[0].message.content, "ollama-fallback"


def grade_answer(lesson_text: str, user_answer: str, core_concept: str) -> dict:
    """NVIDIA now grades, ensuring a 100% reliable demo without Gemini quota errors."""
    grader_prompt = f"""
The teacher asked this question embedded in a story: {lesson_text}
The student answered: {user_answer}
Did the student understand the core concept of {core_concept}?
Reply strictly with 'PASS' or 'FAIL', followed by a 1-sentence reason.
"""
    completion = NVIDIA_CLIENT.chat.completions.create(
        model="meta/llama-3.1-70b-instruct",
        messages=[{"role": "user", "content": grader_prompt}],
        temperature=0.2,  # Low temperature for strict, deterministic grading
        max_tokens=100
    )
    
    text = completion.choices[0].message.content.strip()
    return {"passed": text.upper().startswith("PASS"), "raw": text}