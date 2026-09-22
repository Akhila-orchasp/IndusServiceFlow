from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):

    list_display = (
        "notification_id",
        "recipient_type",
        "notification_type",
        "title",
        "is_read",
        "created_on",
    )

    list_filter = (
        "recipient_type",
        "notification_type",
        "is_read",
    )

    search_fields = (
        "title",
        "message",
    )