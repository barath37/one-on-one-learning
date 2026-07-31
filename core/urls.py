# core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("onboard/", views.onboard, name="onboard"),
    path("lesson/<str:learner_id>/", views.get_lesson, name="get_lesson"),
    path("evaluate/<str:learner_id>/", views.evaluate_answer, name="evaluate_answer"),
    path("mistakes/<str:learner_id>/", views.mistake_history, name="mistake_history"),
]

# --- In your project's root urls.py, add: ---
# from django.urls import include, path
# urlpatterns = [
#     ...
#     path("api/", include("core.urls")),
# ]