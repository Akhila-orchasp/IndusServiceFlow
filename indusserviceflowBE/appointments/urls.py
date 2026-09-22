from rest_framework.routers import DefaultRouter
from .views import AppointmentServiceViewSet, AppointmentViewSet

router = DefaultRouter()

router.register("appointments", AppointmentViewSet, basename="appointment")

router.register(
    "appointment-services", AppointmentServiceViewSet, basename="appointment-service"
)

urlpatterns = router.urls
