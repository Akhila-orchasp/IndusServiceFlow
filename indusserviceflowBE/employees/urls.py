from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import EmployeeViewSet, ShiftViewSet, EmployeeServiceViewSet

router = DefaultRouter()

router.register(r"employees", EmployeeViewSet)
router.register(r"shifts", ShiftViewSet)
router.register(r"employee-services", EmployeeServiceViewSet)

urlpatterns = [
    path("", include(router.urls)),
]