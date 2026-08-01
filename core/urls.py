# core/urls.py — tiny by necessity (Django requires this file), just routes.
from django.urls import path
from . import views

urlpatterns = [
    # Onboarding + psychometric test
    path("psych-questions/", views.psych_questions_view, name="psych_questions"),
    path("onboard/", views.onboard, name="onboard"),

    # Daily relevance / talk-of-the-town
    path("relevance/<str:learner_id>/status/", views.relevance_status, name="relevance_status"),
    path("relevance/<str:learner_id>/questions/", views.relevance_questions, name="relevance_questions"),
    path("relevance/<str:learner_id>/submit/", views.relevance_submit, name="relevance_submit"),

    # Classify -> prereq gate -> simple lesson or auto-escalate to track
    path("classify/", views.classify_topic_view, name="classify_topic"),
    path("prereq/<str:learner_id>/questions/", views.prereq_questions_view, name="prereq_questions"),
    path("prereq/<str:learner_id>/evaluate/", views.prereq_evaluate_view, name="prereq_evaluate"),

    # Simple topic — direct lesson + no-retry fallback
    path("lesson/<str:learner_id>/", views.get_lesson, name="get_lesson"),
    path("evaluate/<str:learner_id>/", views.evaluate_answer, name="evaluate_answer"),

    # Complex topic — iterative curriculum curation -> Track/Module/Submodule
    path("curriculum/iterate/<str:learner_id>/", views.curriculum_iterate, name="curriculum_iterate"),
    path("curriculum/finalize/<str:learner_id>/", views.curriculum_finalize, name="curriculum_finalize"),
    path("tracks/<str:learner_id>/", views.list_tracks, name="list_tracks"),
    path("tracks/modules/<int:track_id>/", views.track_modules, name="track_modules"),
    path("tracks/submodule/<int:submodule_id>/", views.submodule_detail, name="submodule_detail"),
    path("tracks/submodule/<int:submodule_id>/submit/", views.submodule_submit_assignment, name="submodule_submit"),

    # History / Library
    path("mistakes/<str:learner_id>/", views.mistake_history, name="mistake_history"),
    path("topics/<str:learner_id>/", views.topics_explored, name="topics_explored"),

    # Media
    path("tts/", views.text_to_speech, name="text_to_speech"),
    path("voice-recognition/", views.voice_recognition_stub, name="voice_recognition_stub"),
    path("ocr/", views.ocr_stub, name="ocr_stub"),

    # OpenCV Demo
    path("cv-demo/launch/", views.launch_cv_demo, name="launch_cv_demo"),

    # Whiteboard AI Vision
    path("whiteboard/ask/", views.whiteboard_ask, name="whiteboard_ask"),
]
