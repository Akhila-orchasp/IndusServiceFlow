import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_feedback_request_email(customer, appointment, token, service_row=None):
    """
    Sends the "how was your visit" email once a service leg is
    marked Completed, with a link the customer can open (no login
    required) to rate the employee(s) who served them.

    `service_row` is the specific AppointmentService leg that
    triggered this email (each leg gets its own email/token for a
    multi-service appointment); it's optional so this still works
    for callers that only have the appointment as a whole.
    """

    if not customer.Email:
        return "Skipped: no email on file"

    feedback_url = f"{settings.FRONTEND_URL.rstrip('/')}/feedback/{token}"

    subject = "How Was Your Visit? - Indus Service Flow"

    service_line = (
        f"Service              : {service_row.service_name}\n"
        if service_row is not None
        else ""
    )

    message = f"""
Dear {customer.CustomerName},

Thank you for visiting us. Your appointment has been completed.

Appointment Details
--------------------
Appointment Number : {appointment.appointment_number}
Token Number        : {appointment.token_number}
Date                : {appointment.date}
{service_line}
We'd love to hear about your experience. Please take a moment to
rate the service you received:

{feedback_url}

Your feedback helps us recognize our team and improve our service.
This link will remain active for {settings.FEEDBACK_LINK_VALID_DAYS} days.

If you did not visit us recently, please disregard this email.

Regards,

Indus Service Flow Team
"""

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[customer.Email],
            fail_silently=False,
        )

    except Exception as exc:
        logger.exception(
            "Failed to send feedback request email: %s",
            exc
        )
        raise

    return "Sent"