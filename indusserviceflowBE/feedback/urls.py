from django.urls import path

from .views import feedback_form_view, feedback_submit_view

urlpatterns = [
    path("feedback/<str:token>/", feedback_form_view, name="feedback-form"),
    path("feedback/<str:token>/submit/", feedback_submit_view, name="feedback-submit"),
]
