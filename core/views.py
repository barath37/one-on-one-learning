from django.shortcuts import render

# Create your views here.
# core/views.py
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import LearnerProfile, KnowledgeNode, MistakeLog
from .llm_service import build_system_prompt, generate_story, grade_answer


@csrf_exempt
@require_http_methods(["POST"])
def onboard(request):
    """The 'Context Taker' — turns onboarding quiz answers into a LearnerProfile.
    Expects JSON: {"user_id": "...", "stated_age": 17, "domain": "gaming",
                   "inspiration": "Ayrton Senna", "dislikes": "rote memorization"}"""
    data = json.loads(request.body)
    profile, _ = LearnerProfile.objects.update_or_create(
        user_id=data["user_id"],
        defaults={
            "stated_age": data.get("stated_age"),
            "domain_of_interest": data.get("domain", "general"),
            "inspiration": data.get("inspiration", ""),
            "study_dislikes": data.get("dislikes", ""),
            "preferred_metaphor_domain": data.get("domain", "Panchatantra animals"),
            "current_node_id": data.get("start_node_id", "math_addition"),
        },
    )
    return JsonResponse({"user_id": profile.user_id, "current_node_id": profile.current_node_id})


@require_http_methods(["GET"])
def get_lesson(request, learner_id):
    """Generates the story + question for wherever the learner currently is."""
    profile = LearnerProfile.objects.get(user_id=learner_id)
    node = KnowledgeNode.objects.get(node_id=profile.current_node_id)

    system_prompt = build_system_prompt(node, profile)
    lesson_text, source = generate_story(system_prompt)

    return JsonResponse({
        "node_id": node.node_id,
        "title": node.title,
        "lesson_text": lesson_text,
        "source": source,  # "nvidia" or "ollama-fallback" — handy to show in the UI/logs
    })


@csrf_exempt
@require_http_methods(["POST"])
def evaluate_answer(request, learner_id):
    """The 'no retry' loop: grade the answer, mutate persona, log mistakes,
    and redirect to a prerequisite node instead of just saying 'wrong, try again.'"""
    data = json.loads(request.body)
    user_answer = data["answer"]
    lesson_text = data["lesson_text"]

    profile = LearnerProfile.objects.get(user_id=learner_id)
    node = KnowledgeNode.objects.get(node_id=profile.current_node_id)

    grade = grade_answer(lesson_text, user_answer, node.core_concept)

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
        if profile.frustration_score >= 2 and node.prerequisite_node_id:
            profile.current_node_id = node.prerequisite_node_id

    profile.save()
    return JsonResponse({
        "passed": grade["passed"],
        "feedback": grade["raw"],
        "next_node": profile.current_node_id,
        "frustration_score": profile.frustration_score,
    })


@require_http_methods(["GET"])
def mistake_history(request, learner_id):
    """For the 'visualize the redirect' part — a timeline of what went wrong and where it routed."""
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