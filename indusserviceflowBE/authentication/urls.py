from django.urls import path
from .views import (
    create_super_admin,
    login,
    logout,
    verify_token,
    forgot_password,
    verify_otp,
    reset_password,
    change_password,
)

urlpatterns = [
    path("create-super-admin/", create_super_admin),
    path("login/", login),
    path("logout/", logout),
    path("verify-token/", verify_token),
    path("forgot-password/", forgot_password),
    path("verify-otp/", verify_otp),
    path("reset-password/", reset_password),
    path("change-password/", change_password),
]
