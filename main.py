import os
from openai import OpenAI
from google import genai  
from gtts import gTTS

nvidia_client = OpenAI(
  base_url="https://integrate.api.nvidia.com/v1",
  api_key="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"  # <--- PASTE REAL KEY HERE
)

gemini_client = genai.Client(
    api_key="AIzaSyAWF2VC9CT7HA1obzwnEgW0gl0KvKb04kM"      # <--- PASTE REAL KEY HERE
)

while(True):
    if not nvidia_client or not gemini_client:
        print("Error: NVIDIA or Gemini client not initialized. Please check your API keys.")
        break
# Personna
learner = {
    "age": 17,
    "prep_level": "JEE Advanced",
    "loves": "Formula 1 racing",
    "dialect": "Kongu Tamil style English"
}
concept_logic = "Limits and Continuity in Calculus."

# ==========================================
# STEP 1: NVIDIA GENERATES THE STORY (API 1)
# ==========================================
print("--- 1. NVIDIA API GENERATING LESSON ---")
nvidia_prompt = f"""
You are a Gurukul mentor. Teach {concept_logic}.
Learner loves: {learner['loves']}. Dialect: {learner['dialect']}.
Wrap the logic in a 100-word story about their passion. End with ONE conceptual question.
"""

completion = nvidia_client.chat.completions.create(
  model="meta/llama-3.1-70b-instruct", # FIXED: Updated to the active 3.1 model
  messages=[{"role": "user", "content": nvidia_prompt}],
  temperature=0.7,
  max_tokens=250
)
lesson_text = completion.choices[0].message.content
print(lesson_text)

# ==========================================
# STEP 2: VOICE API GENERATES AUDIO (API 2)
# ==========================================
print("\n--- 2. TTS API GENERATING AUDIO ---")
tts = gTTS(text=lesson_text, lang='en', tld='co.in') 
audio_file = "gurukul_lesson.mp3"
tts.save(audio_file)
print(f"Audio saved as {audio_file}. (Ready to play!)")

# ==========================================
# STEP 3: GEMINI GRADES THE ANSWER (API 3)
# ==========================================
print("\n--- 3. GEMINI API GRADING ANSWER ---")
user_answer = input("\nSimulate User Answer (e.g., 'The limit is the top speed'): ")

grader_prompt = f"""
The teacher asked this question embedded in a story: {lesson_text}
The student answered: {user_answer}
Did the student understand the core concept of {concept_logic}? 
Reply strictly with 'PASS' or 'FAIL', followed by a 1-sentence reason.
"""
grade = gemini_client.models.generate_content(
    model='gemini-1.5-flash',  # <--- Change this from 2.0 to 1.5
    contents=grader_prompt
)

print("\n[EVALUATION RESULT]")
print(grade.text)