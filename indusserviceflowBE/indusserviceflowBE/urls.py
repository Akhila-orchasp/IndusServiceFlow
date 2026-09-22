from django.contrib import admin
from django.urls import path, include

from plans.views import public_plans
from organizations.views import (
    registration_payment_status,
    simulate_registration_payment,
    get_my_subscription_status,
    renew_subscription,
    get_renewal_payment_status,
    download_subscription_receipt,
    download_public_subscription_receipt,
)


urlpatterns = [
    path("admin/", admin.site.urls),
    path('api/simulation/', include('simulation.urls')),
    path("api/auth/",include("authentication.urls")),
    path("api/super-admin/categories/", include("categories.urls")),
    path("api/super-admin/organizations/", include("organizations.urls")),
    path("api/super-admin/plans/", include("plans.urls")),
    path("api/public/plans/", public_plans),
    path("api/public/subscriptions/<int:subscription_id>/payment-status/", registration_payment_status),
    path("api/public/subscriptions/<int:subscription_id>/simulate-payment/", simulate_registration_payment),
    path("api/public/subscriptions/<int:subscription_id>/receipt/", download_public_subscription_receipt),
    path("api/super-admin/subscriptions/", include("subscriptions.urls")),
    path("api/super-admin/users/",include("users.urls")),
    path("api/super-admin/profiles/",include("profiles.urls")),
    path("api/super-admin/audit-logs/", include("audit_logs.urls")),
    path("api/super-admin/", include("dashboard.urls")),

    path("api/organization/profiles/", include("profiles.urls")),
    path("api/organization/audit-logs/", include("audit_logs.urls")),
    path("api/organization/subscription-status/", get_my_subscription_status),
    path("api/organization/subscriptions/renew/", renew_subscription),
    path("api/organization/subscriptions/<int:subscription_id>/payment-status/", get_renewal_payment_status),
    path("api/organization/subscriptions/<int:subscription_id>/simulate-payment/", simulate_registration_payment),
    path("api/organization/subscriptions/<int:subscription_id>/receipt/", download_subscription_receipt),

    path("api/employee/profiles/", include("profiles.urls")),

    path("api/", include("employees.urls")),
    path("api/", include("customers.urls")),
    path("api/", include("appointments.urls")),
    path("api/", include("services.urls")),
    path("api/", include("queues.urls")),
    path("api/", include("notifications.urls")),
    path("api/", include("feedback.urls")),

    path("api/categories/", include("categories.urls")),
    path("api/organizations/", include("organizations.urls")),
    path("api/reports/", include("report.urls")),

    path("api/dashboard/",include("dashboard.urls"),),
    
]