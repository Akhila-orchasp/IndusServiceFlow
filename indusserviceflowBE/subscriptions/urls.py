from django.urls import path

from .views import (
    add_subscription,
    get_subscriptions,
    get_subscription,
    update_subscription,
    export_subscriptions,
    force_activate_subscription,
    delete_subscription,
)

urlpatterns = [
    path("add/", add_subscription),
    path("", get_subscriptions),
    path("<int:id>/", get_subscription),
    path("update/<int:id>/", update_subscription),
    path("export/", export_subscriptions),
    path("<int:id>/activate/", force_activate_subscription),
    path("<int:id>/delete/", delete_subscription),
]