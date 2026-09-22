import logging

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from appointments.models import AppointmentService
from notifications.services import notify_employee, notify_org_admins

from .models import Feedback

logger = logging.getLogger(__name__)


class FeedbackFormSerializer(serializers.Serializer):
    """
    Read-only shape returned to the (unauthenticated) feedback page
    so it knows what to render: the appointment it belongs to, and
    one row per service leg the customer can rate.
    """

    appointment_number = serializers.CharField(source="appointment.appointment_number")
    token_number = serializers.CharField(source="appointment.token_number")
    date = serializers.DateField(source="appointment.date")
    customer_name = serializers.CharField(source="appointment.customer.CustomerName")
    organization_name = serializers.SerializerMethodField()
    is_submitted = serializers.BooleanField()
    services = serializers.SerializerMethodField()

    def get_organization_name(self, feedback_request):
        org = feedback_request.appointment.org
        return org.organization_name if org else None

    def get_services(self, feedback_request):

        rows = feedback_request.appointment.services.filter(
            status="Completed",
            employee__isnull=False,
        ).select_related("employee")

        existing = {
            row.appointment_service_id: row
            for row in Feedback.objects.filter(appointment_service__in=rows)
        }

        services = []

        for row in rows:

            existing_feedback = existing.get(row.appointment_service_id)

            services.append(
                {
                    "appointment_service_id": row.appointment_service_id,
                    "service_name": row.service_name,
                    "employee_id": row.employee_id,
                    "employee_name": row.employee.employee_name,
                    "already_rated": existing_feedback is not None,
                    "rating": existing_feedback.rating if existing_feedback else None,
                    "comment": existing_feedback.comment if existing_feedback else None,
                }
            )

        return services


class FeedbackItemInputSerializer(serializers.Serializer):

    appointment_service_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )


class FeedbackSubmitSerializer(serializers.Serializer):
    """
    Accepts one rating per service leg in a single submission, since
    an appointment can involve several employees and each gets rated
    separately.
    """

    ratings = FeedbackItemInputSerializer(many=True)

    def validate_ratings(self, value):

        if not value:
            raise serializers.ValidationError("At least one rating is required.")

        seen_ids = [item["appointment_service_id"] for item in value]

        if len(seen_ids) != len(set(seen_ids)):
            raise serializers.ValidationError("Duplicate service in submission.")

        return value

    def validate(self, attrs):

        feedback_request = self.context["feedback_request"]
        appointment = feedback_request.appointment

        valid_service_ids = set(
            appointment.services.filter(
                status="Completed",
                employee__isnull=False,
            ).values_list("appointment_service_id", flat=True)
        )

        for item in attrs["ratings"]:

            if item["appointment_service_id"] not in valid_service_ids:
                raise serializers.ValidationError(
                    "One or more services in this submission do not "
                    "belong to this appointment."
                )

        return attrs

    def create(self, validated_data):

        feedback_request = self.context["feedback_request"]
        appointment = feedback_request.appointment

        rated_legs = []

        with transaction.atomic():

            for item in validated_data["ratings"]:

                service_row = AppointmentService.objects.select_related("employee").get(
                    appointment_service_id=item["appointment_service_id"]
                )

                Feedback.objects.update_or_create(
                    appointment_service=service_row,
                    defaults={
                        "appointment": appointment,
                        "employee": service_row.employee,
                        "customer": appointment.customer,
                        "org": appointment.org,
                        "rating": item["rating"],
                        "comment": item.get("comment") or "",
                    },
                )

                if service_row.employee_id:
                    rated_legs.append(
                        {
                            "employee": service_row.employee,
                            "service_name": service_row.service_name,
                            "rating": item["rating"],
                            "comment": item.get("comment") or "",
                        }
                    )

            feedback_request.is_submitted = True
            feedback_request.submitted_on = timezone.now()
            feedback_request.save(update_fields=["is_submitted", "submitted_on"])

        self._notify_feedback_received(appointment, rated_legs)

        return feedback_request

    def _notify_feedback_received(self, appointment, rated_legs):
        """Notify each rated employee, and the org's admins once for
        the whole submission. Never raises - a failed notification
        must not surface as a failed feedback submission to the
        (unauthenticated) customer."""

        if not rated_legs:
            return

        customer = appointment.customer
        customer_name = customer.CustomerName if customer else "A customer"

        for leg in rated_legs:
            try:
                comment_part = f': "{leg["comment"]}"' if leg["comment"] else "."
                notify_employee(
                    leg["employee"],
                    title="New feedback received",
                    message=(
                        f'{customer_name} rated your {leg["service_name"]} '
                        f'service {leg["rating"]}/5{comment_part}'
                    ),
                    notification_type="Feedback Received",
                    appointment=appointment,
                )
            except Exception:
                logger.exception(
                    "Failed to notify employee %s of feedback on appointment %s",
                    leg["employee"],
                    appointment.appointment_number,
                )

        try:
            employee_names = ", ".join(
                sorted({leg["employee"].employee_name for leg in rated_legs})
            )
            average_rating = sum(leg["rating"] for leg in rated_legs) / len(rated_legs)

            notify_org_admins(
                appointment.org,
                title="New customer feedback",
                message=(
                    f"{customer_name} left feedback for {employee_names} "
                    f"(avg {average_rating:.1f}/5) on appointment "
                    f"{appointment.appointment_number}."
                ),
                notification_type="Feedback Received",
                appointment=appointment,
            )
        except Exception:
            logger.exception(
                "Failed to notify org admins of feedback on appointment %s",
                appointment.appointment_number,
            )
