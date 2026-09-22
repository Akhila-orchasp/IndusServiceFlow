from django.urls import path
from .views import (
    get_audit_logs,
    export_audit_logs,
    get_user_audit_history,
    export_user_audit_history,
)

urlpatterns = [
    path("", get_audit_logs),
    path("export/", export_audit_logs),
    path("user/<str:username>/", get_user_audit_history),
    path("user/<str:username>/export/", export_user_audit_history),
]
