from django.urls import path
from .views import get_profile, update_profile, change_password, acknowledge_first_login

urlpatterns = [
    path("", get_profile),
    path("update/", update_profile),
    path("change-password/", change_password),
    path("acknowledge-first-login/", acknowledge_first_login),
]