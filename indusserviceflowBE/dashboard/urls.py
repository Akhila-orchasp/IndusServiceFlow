from django.urls import path
from .views import dashboard
from .views import (
    create_contact_message,
    get_contact_messages,
    mark_contact_message_read,
)
urlpatterns = [
    path("dashboard/", dashboard, name="dashboard"),
    path("contact/",create_contact_message,name="create-contact-message",),

    path("contact/messages/",get_contact_messages,name="get-contact-messages",),

    path("contact/messages/<int:message_id>/read/",mark_contact_message_read,name="mark-contact-message-read",),
]