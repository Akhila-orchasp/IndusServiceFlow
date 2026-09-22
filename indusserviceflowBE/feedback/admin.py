from django.contrib import admin

from .models import Feedback, FeedbackRequest


@admin.register(FeedbackRequest)
class FeedbackRequestAdmin(admin.ModelAdmin):
    list_display = (
        "feedback_request_id",
        "appointment",
        "is_submitted",
        "created_on",
        "expires_on",
        "submitted_on",
    )
    list_filter = ("is_submitted",)
    search_fields = ("token", "appointment__appointment_number")


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = (
        "feedback_id",
        "appointment",
        "appointment_service",
        "employee",
        "customer",
        "rating",
        "created_on",
    )
    list_filter = ("rating",)
    search_fields = ("appointment__appointment_number", "employee__employee_name")
