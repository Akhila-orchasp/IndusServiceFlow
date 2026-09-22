from .models import Notification
from users.models import User


def _same_actor(actor, obj):
    """Return True when the actor represents the notification recipient object."""
    if actor is None or obj is None:
        return False

    actor_id = getattr(actor, "id", getattr(actor, "pk", None))
    obj_id = getattr(obj, "id", getattr(obj, "pk", None))
    if actor_id is None or obj_id is None or actor_id != obj_id:
        return False

    actor_role = getattr(actor, "role", None)
    if actor_role == "EMPLOYEE" and obj.__class__.__name__ == "Employee":
        return True
    if actor_role == "ORG_ADMIN" and obj.__class__.__name__ == "User":
        return True
    return False


def _is_super_admin(actor):
    return getattr(actor, "role", None) == "SUPER_ADMIN"


def notify_customer(customer, title, message, notification_type="General", appointment=None, actor=None):
    """Notify a customer unless that customer is the actor."""
    if _same_actor(actor, customer):
        return None

    return Notification.objects.create(
        org_id=getattr(customer, "organization_id", None),
        recipient_type="Customer",
        customer=customer,
        appointment=appointment,
        notification_type=notification_type,
        title=title,
        message=message,
    )


def notify_employee(employee, title, message, notification_type="General", appointment=None, actor=None):
    """Notify an employee unless that employee is the actor."""
    if _same_actor(actor, employee):
        return None

    return Notification.objects.create(
        org_id=getattr(employee, "org_id", None),
        recipient_type="Employee",
        employee=employee,
        appointment=appointment,
        notification_type=notification_type,
        title=title,
        message=message,
    )


def notify_super_admin(organization, title, message, notification_type="Organization Registration", actor=None):
    """Create a platform notification for Super Admin, excluding the actor."""
    if _is_super_admin(actor):
        return None

    return Notification.objects.create(
        org_id=getattr(organization, "id", None),
        recipient_type="Organization",
        appointment=None,
        notification_type=notification_type,
        title=title,
        message=message,
    )


def notify_org_admins(organization, title, message, notification_type="General", appointment=None, actor=None):
    """Notify every admin of an organization except the user who caused the event."""
    if organization is None:
        return []

    actor_id = getattr(actor, "id", getattr(actor, "pk", None)) if actor is not None else None
    admins = User.objects.filter(
        organization=organization,
        role="ORG_ADMIN",
    )
    if actor_id is not None:
        admins = admins.exclude(id=actor_id)

    notifications = []
    for admin in admins:
        notifications.append(
            Notification.objects.create(
                org=organization,
                recipient_type="OrganizationAdmin",
                recipient_user=admin,
                appointment=appointment,
                notification_type=notification_type,
                title=title,
                message=message,
            )
        )
    return notifications


def notify_org_admin(organization, title, message, notification_type="General", appointment=None, actor=None):
    """Backward-compatible singular wrapper for existing callers."""
    return notify_org_admins(
        organization=organization,
        title=title,
        message=message,
        notification_type=notification_type,
        appointment=appointment,
        actor=actor,
    )
