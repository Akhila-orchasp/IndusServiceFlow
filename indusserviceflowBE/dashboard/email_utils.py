import logging

from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone

logger = logging.getLogger(__name__)


def send_contact_notification_email(contact_message):
    """
    Emails the team when someone submits the landing-page contact form.

    - Goes out through the project's SMTP account (EMAIL_HOST_USER), so with
      Gmail SMTP a copy also lands in that account's Sent folder.
    - Delivered to CONTACT_NOTIFICATION_EMAIL (falls back to EMAIL_HOST_USER).
    - Reply-To is the visitor's address, so hitting "Reply" answers them
      directly instead of replying to the SMTP account itself.
    """

    recipient = (
        getattr(settings, "CONTACT_NOTIFICATION_EMAIL", None)
        or settings.EMAIL_HOST_USER
    )

    # Collapse any whitespace/newlines so user input can never break the
    # subject header.
    clean_subject = " ".join(contact_message.subject.split())

    received_at = timezone.localtime(contact_message.created_at)

    subject = f"[Contact Form] {clean_subject} - Indus Service Flow"

    body = f"""
A new message was submitted through the Indus Service Flow contact form.

Sender Details
--------------
Name    : {contact_message.full_name}
Email   : {contact_message.email}
Subject : {clean_subject}
Received: {received_at:%d %b %Y, %I:%M %p %Z}

Message
-------
{contact_message.message}

--
Reply to this email to respond directly to {contact_message.full_name}.
(Message ID #{contact_message.pk} in the ContactMessage table.)
"""

    try:
        EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.EMAIL_HOST_USER,
            to=[recipient],
            reply_to=[contact_message.email],
        ).send(fail_silently=False)

    except Exception as exc:
        logger.exception(
            "Failed to send contact notification email for message %s: %s",
            contact_message.pk,
            exc,
        )
        raise

    return "Sent"