from django.contrib import admin
from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "organization",
        "plan",
        "billing_cycle",
        "employees",
        "monthly_revenue",
        "status",
        "start_date",
        "next_payment_date",
    )

    search_fields = (
        "organization__organization_name",
        "plan__plan_name",
    )

    list_filter = (
        "billing_cycle",
        "status",
    )

    ordering = ("-created_on",)