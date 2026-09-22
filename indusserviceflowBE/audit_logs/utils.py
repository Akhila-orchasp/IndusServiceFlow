from .models import AuditLog

ROLE_DISPLAY_MAP = {
    "SUPER_ADMIN": "Super Admin",
    "ORG_ADMIN": "Organization Admin",
    "EMPLOYEE": "Employee",
}


def log_action(user, action_name, action_screen, target_info=None):
    """Create an audit log entry. Call this right after any action
    (login/logout/create/update/delete/export/approve/reject/assign/
    status-change/view) succeeds."""
    AuditLog.objects.create(
        organization=getattr(user, "organization", None),
        username=user.username,
        role=ROLE_DISPLAY_MAP.get(user.role, user.role),
        action_name=action_name,
        action_screen=action_screen,
        target_info=target_info,
    )
