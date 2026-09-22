from django.urls import path

from .views import organization_report, superadmin_report

urlpatterns = [
    path("organization/<int:org_id>/", organization_report),
    path("superadmin/", superadmin_report),
]
