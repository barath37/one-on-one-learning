import os
from openai import OpenAI
from google import genai  
from gtts import gTTS
from dotenv import load_dotenv

load_dotenv()

nvidia_client = OpenAI(
  base_url="https://integrate.api.nvidia.com/v1",
  api_key=os.environ.get("NVIDIA_API_KEY")  
)

# 2. Gemini API (The Grader)
gemini_client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY")
)

if not nvidia_client or not gemini_client:
    print("Error: NVIDIA or Gemini client not initialized. Please check your API keys.")

age = int(input("Enter learner's age: "))
prep_level = input("Enter learner's preparation level (e.g., JEE Advanced): ")
interest_domain = input("Enter learner's domain of interest (can be anything): ")
dialect = input("Enter where were you born and what language do you speak and where you reside?: ")

# Persona
learner = {
    "age": int(age),
    "prep_level": prep_level,
    "loves": interest_domain,
    "dialect": dialect
}
concept_logic = input("Enter the core concept logic to teach: ")

print("--- 1. NVIDIA API GENERATING LESSON ---")
nvidia_prompt = f"""
You are a Gurukul mentor. Teach {concept_logic}.
Learner loves: {learner['loves']}. Dialect: {learner['dialect']}.Here is the complete details about the persona of the learner: {learner}.
Wrap the logic in a 100-word story about their passion and include a local example that is relevant like a insider thing.Make sure the story is engaging and educational while breaking down the concept into bits and pieces with explanations for each steps. And prefferably the story should a amarchitra or thirukural kadha or tamil kadhai we'll know in common. End with ONE conceptual question.
"""

completion = nvidia_client.chat.completions.create(
  model="meta/llama-3.1-70b-instruct", 
  messages=[{"role": "user", "content": nvidia_prompt}],
  temperature=0.7,
  max_tokens=250
)
lesson_text = completion.choices[0].message.content
print(lesson_text)

print("\n--- 2. TTS API GENERATING AUDIO ---")
tts = gTTS(text=lesson_text, lang='en', tld='co.in') 
audio_file = f"gurukul_lesson_{concept_logic.replace(' ', '_')}.mp3"
tts.save(audio_file)
print(f"Audio saved as {audio_file}. (Ready to play!)")

print("\n--- 3. GEMINI API GRADING ANSWER ---")
user_answer = input("\nSimulate User Answer (e.g., 'The limit is the top speed'): ")

grader_prompt = f"""
The teacher asked this question embedded in a story: {lesson_text}
The student answered: {user_answer}
Did the student understand the core concept of {concept_logic}? 
Reply strictly with 'PASS' or 'FAIL', followed by a 1-sentence reason.
"""
# grade = gemini_client.models.generate_content(
#     model='gemini-1.5-flash',  # <--- Change this from 2.0 to 1.5
#     contents=grader_prompt
# )
grade = nvidia_client.chat.completions.create(
  model="meta/llama-3.1-70b-instruct",
  messages=[{"role": "user", "content": grader_prompt}],
  temperature=0.2, 
  max_tokens=100
)
print("\n[EVALUATION RESULT]")
print(grade.choices[0].message.content)


