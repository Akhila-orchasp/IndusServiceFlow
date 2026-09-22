from django.urls import path

from .views import (
    register_organization,
    get_organizations,
    get_organization,
    approve_organization,
    reject_organization,
    delete_organization,
    export_organizations,
    org_dashboard,
)

urlpatterns = [
    path("register/", register_organization),
    path("", get_organizations),
    path("export/", export_organizations),
    path("approve/<int:pk>/", approve_organization),
    path("reject/<int:pk>/", reject_organization),
    path("delete/<int:pk>/", delete_organization),
    path("<int:pk>/", get_organization),
    path("dashboard/", org_dashboard),
]