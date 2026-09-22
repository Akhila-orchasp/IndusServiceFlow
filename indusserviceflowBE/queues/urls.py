# queues/urls.py

from rest_framework.routers import DefaultRouter
from .views import QueueManagementViewSet

router = DefaultRouter()

router.register(
    r"queue-management",
    QueueManagementViewSet,
    basename="queue-management"
)

urlpatterns = router.urls