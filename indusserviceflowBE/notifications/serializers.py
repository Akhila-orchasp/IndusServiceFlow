from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):

    customer_name = serializers.CharField(
        source="customer.CustomerName",
        read_only=True,
        default=None,
    )

    recipient_user_name = serializers.CharField(
        source="recipient_user.name",
        read_only=True,
        default=None,
    )

    employee_name = serializers.CharField(
        source="employee.employee_name",
        read_only=True,
        default=None,
    )

    organization_name = serializers.CharField(
        source="org.organization_name",
        read_only=True,
        default=None,
    )

    appointment_number = serializers.CharField(
        source="appointment.appointment_number",
        read_only=True,
        default=None,
    )

    class Meta:
        model = Notification
        fields = [
            "notification_id",
            "org_id",
            "recipient_type",
            "customer",
            "customer_name",
            "employee",
            "employee_name",
            "recipient_user",
            "recipient_user_name",
            "organization_name",
            "appointment",
            "appointment_number",
            "notification_type",
            "title",
            "message",
            "is_read",
            "created_on",
            "read_on",
        ]

        read_only_fields = [
            "notification_id",
            "created_on",
            "read_on",
        ]
