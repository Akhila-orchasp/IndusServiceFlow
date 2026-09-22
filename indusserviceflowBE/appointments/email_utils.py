from django.conf import settings
from django.core.mail import send_mail
import logging

from .utils import compute_service_leg_start_times

logger = logging.getLogger(__name__)


def _format_services(appointment, service_rows):
    """
    Formats appointment services for the email body.

    service_rows must already be in canonical leg order (the order
    they were created in / appointment_service_id order — the same
    order used everywhere else this offset is computed). Multi-service
    appointments run their legs back-to-back rather than all starting
    at appointment.time, so each leg's own start time is shown here
    rather than reusing the appointment's single start time for every
    line.
    """

    lines = []

    legs = compute_service_leg_start_times(appointment.time, service_rows)

    for service, start_time in legs:

        employee_name = (
            service.employee.employee_name if service.employee else "To be assigned"
        )

        fee = service.fee if service.fee else 0
        duration = service.duration_min if service.duration_min else 0

        lines.append(
            f"- {service.service_name} "
            f"at {start_time.strftime('%H:%M')} "
            f"with {employee_name} "
            f"({duration} min, Rs.{fee})"
        )

    return "\n".join(lines)


def send_appointment_confirmation_email(customer, appointment, service_rows):
    """
    Sends appointment booking confirmation email.
    """

    if not customer.Email:
        return "Skipped: no email on file"

    subject = "Appointment Confirmed - Indus Service Flow"

    message = f"""
Dear {customer.CustomerName},

Your appointment has been booked successfully.

Booking Details
----------------
Appointment Number : {appointment.appointment_number}
Token Number       : {appointment.token_number}
Date               : {appointment.date}
Time               : {appointment.time}

Services
--------
{_format_services(appointment, service_rows)}

Total Duration : {appointment.total_duration_min} min
Total Fee      : Rs.{appointment.total_fee}

Please arrive a few minutes before your scheduled time.

If you did not make this booking, please contact the organization directly.

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
        logger.exception("Failed to send appointment confirmation email: %s", exc)
        raise

    return "Sent"


def send_appointment_status_update_email(customer, appointment, old_status, new_status):
    """
    Sends appointment status update email.
    """

    if not customer.Email:
        return

    subject = "Appointment Status Updated - Indus Service Flow"

    message = f"""
Dear {customer.CustomerName},

Your appointment status has been updated.

Appointment Details
-------------------
Appointment Number : {appointment.appointment_number}
Token Number       : {appointment.token_number}
Date               : {appointment.date}
Time               : {appointment.time}

Status Changed
--------------
Previous Status : {old_status}
Current Status  : {new_status}

If you have any questions regarding this appointment, please contact the organization directly.

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
        logger.exception("Failed to send appointment status email: %s", exc)


def send_reschedule_email(customer, appointment, old_date, old_time):
    """
    Sent when an employee reschedules a waiting customer's appointment
    to a new date/time, so the customer isn't left finding out only
    by checking back in.
    """

    if not customer.Email:
        return "Skipped: no email on file"

    subject = "Your Appointment Has Been Rescheduled - Indus Service Flow"

    message = f"""
Dear {customer.CustomerName},

Your appointment has been rescheduled to a new date and time.

Appointment Details
--------------------
Appointment Number : {appointment.appointment_number}
Token Number        : {appointment.token_number}

Previous Date/Time  : {old_date} {old_time}
New Date/Time       : {appointment.date} {appointment.time}

Please arrive a few minutes before your new scheduled time.

If you have any questions regarding this change, please contact the
organization directly.

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
        logger.exception("Failed to send reschedule email: %s", exc)
        raise

    return "Sent"


def send_transfer_email(
    customer, appointment, old_employee, new_employee, service_names
):
    """
    Sent to the customer whenever their appointment (or one or more
    of its services) is transferred from one employee to another,
    so they aren't left wondering why "their" team member changed.

    service_names: list of service_name strings that were moved in
    this transfer (an appointment can have several services; only
    the ones actually reassigned are listed here).
    """

    if not customer.Email:
        return "Skipped: no email on file"

    subject = "Your Appointment Has Been Transferred - Indus Service Flow"

    old_employee_name = (
        old_employee.employee_name if old_employee else "your previous team member"
    )
    new_employee_name = (
        new_employee.employee_name if new_employee else "a new team member"
    )

    services_block = "\n".join(f"- {name}" for name in service_names)

    message = f"""
Dear {customer.CustomerName},

Your appointment has been transferred to another team member.

Appointment Details
--------------------
Appointment Number : {appointment.appointment_number}
Token Number        : {appointment.token_number}
Date                : {appointment.date}
Time                : {appointment.time}

Transferred Services
---------------------
{services_block}

Transferred From : {old_employee_name}
Transferred To    : {new_employee_name}

Your position in the queue is unaffected. If you have any questions,
please contact the organization directly.

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
        logger.exception("Failed to send transfer email: %s", exc)
        return "Failed"

    return "Sent"
