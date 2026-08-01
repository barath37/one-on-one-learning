# core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("onboard/", views.onboard, name="onboard"),
    path("icebreaker/<str:learner_id>/status/", views.icebreaker_status, name="icebreaker_status"),
    path("icebreaker/<str:learner_id>/submit/", views.icebreaker_submit, name="icebreaker_submit"),
    path("lesson/<str:learner_id>/", views.get_lesson, name="get_lesson"),
    path("evaluate/<str:learner_id>/", views.evaluate_answer, name="evaluate_answer"),
    path("mistakes/<str:learner_id>/", views.mistake_history, name="mistake_history"),
    path("topics/<str:learner_id>/", views.topics_explored, name="topics_explored"),
]