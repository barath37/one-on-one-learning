# core/views.py
import json
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import LearnerProfile, KnowledgeNode, MistakeLog
from .llm_service import (
    build_system_prompt, generate_story, grade_answer,
    extract_interest_from_icebreaker,
)


@csrf_exempt
@require_http_methods(["POST"])
def onboard(request):
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


@require_http_methods(["GET"])
def get_lesson(request, learner_id):
    profile = LearnerProfile.objects.get(user_id=learner_id)
    node = KnowledgeNode.objects.get(node_id=profile.current_node_id)
    prerequisite_node = None
    if node.prerequisite_node_id:
        prerequisite_node = KnowledgeNode.objects.filter(node_id=node.prerequisite_node_id).first()

    system_prompt = build_system_prompt(node, profile, prerequisite_node=prerequisite_node)
    lesson_text, source = generate_story(system_prompt)

    return JsonResponse({
        "node_id": node.node_id,
        "title": node.title,
        "lesson_text": lesson_text,
        "source": source,
        "mode": "implicit-repair" if profile.frustration_score == 1 and prerequisite_node else "normal",
    })


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