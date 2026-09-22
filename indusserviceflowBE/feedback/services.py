import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError
from django.utils import timezone

from .email_utils import send_feedback_request_email
from .models import FeedbackRequest

logger = logging.getLogger(__name__)


def request_feedback_for_service(service_row):
    """
    Call this the moment a single AppointmentService leg becomes
    "Completed" - it does NOT wait for the rest of the appointment.

    A customer who books three services and has the first one
    finished should be able to rate that employee straight away,
    while the visit is still fresh, rather than being held back until
    the third employee happens to finish. Each leg therefore gets its
    own feedback request, its own token and its own email.

    Safe to call more than once for the same leg - the request is
    only created the first time, so no duplicate emails.

    Never raises - mirrors every other post-status-change side effect
    in this codebase (notify_customer, notify_employee, the status
    update email), all of which are best-effort and must not block
    the status change that already committed to the DB.
    """

    if service_row is None:
        return

    if service_row.status != "Completed":
        return

    # Nothing to rate if no employee actually served this leg.
    if not service_row.employee_id:
        return

    try:

        if FeedbackRequest.objects.filter(appointment_service=service_row).exists():
            return

    except Exception:
        # A lookup failure here (e.g. schema drift) must not take
        # down the status change that already committed - see the
        # "never raises" contract above.
        logger.exception(
            "Failed to check existing feedback request for appointment "
            "%s service %s",
            service_row.appointment.appointment_number,
            service_row.appointment_service_id,
        )
        return

    appointment = service_row.appointment

    customer = appointment.customer

    if not customer or not customer.Email:
        return

    try:

        feedback_request = FeedbackRequest.objects.create(
            appointment=appointment,
            appointment_service=service_row,
            token=secrets.token_urlsafe(32),
            expires_on=timezone.now()
            + timedelta(days=settings.FEEDBACK_LINK_VALID_DAYS),
        )

    except IntegrityError:
        # Two workers completed/re-saved the same leg at once; the
        # unique constraint on appointment_service means the other
        # one already created the request and sent the email.
        return

    except Exception:
        logger.exception(
            "Failed to create feedback request for appointment %s service %s",
            appointment.appointment_number,
            service_row.appointment_service_id,
        )
        return

    try:
        send_feedback_request_email(
            customer,
            appointment,
            feedback_request.token,
            service_row=service_row,
        )

    except Exception:
        logger.exception(
            "Failed to send feedback request email for appointment %s service %s",
            appointment.appointment_number,
            service_row.appointment_service_id,
        )


def request_feedback_for_appointment(appointment):
    """
    Fan out request_feedback_for_service() across every completed leg
    of an appointment that doesn't have a request yet.

    Used by paths that finish an appointment as a whole (e.g. an
    admin setting the status to "Completed" from the appointments
    screen) rather than one leg at a time. Legs that were already
    emailed when they individually completed are skipped, so this
    never produces a duplicate.

    Never raises.
    """

    if appointment is None:
        return

    rows = appointment.services.select_related("employee", "appointment").filter(
        status="Completed",
        employee__isnull=False,
        feedback_request__isnull=True,
    )

    for service_row in rows:
        request_feedback_for_service(service_row)