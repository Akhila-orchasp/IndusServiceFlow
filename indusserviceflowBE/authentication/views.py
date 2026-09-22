import logging
import random
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from users.models import User
from employees.authentication import EmployeeUser
from audit_logs.utils import log_action

from .serializers import (
    SuperAdminSerializer,
    LoginSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ChangePasswordSerializer,
    VerifyOtpSerializer,
)

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([AllowAny])
def create_super_admin(request):

    if User.objects.filter(role="SUPER_ADMIN").exists():
        return Response(
            {
                "success": False,
                "message": "Super Admin already exists.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = SuperAdminSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()

        return Response(
            {
                "success": True,
                "message": "Super Admin created successfully.",
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):

    serializer = LoginSerializer(data=request.data)

    if serializer.is_valid():

        data = serializer.validated_data

        if serializer.resolved_actor == "employee":
            log_action(
                EmployeeUser(serializer.resolved_instance),
                "Login",
                "Session",
            )
        else:
            log_action(
                serializer.resolved_instance,
                "Login",
                "Session",
            )

        return Response(
            {
                "success": True,
                "message": "Login Successful.",
                "data": data,
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        {
            "success": False,
            "message": "Login failed.",
            "errors": serializer.errors,
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):

    log_action(request.user, "Logout", "Session")

    return Response(
        {
            "success": True,
            "message": "Logged out successfully.",
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def verify_token(request):

    return Response(
        {
            "success": True,
            "message": "JWT Token is Valid.",
            "username": request.user.username,
            "name": request.user.name,
            "email": request.user.email,
            "role": request.user.role,
            "status": request.user.status,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):

    serializer = ForgotPasswordSerializer(data=request.data)

    if serializer.is_valid():

        data = serializer.validated_data

        login_value = data.get("username") or data.get("email")

        try:
            if "@" in login_value:
                user = User.objects.get(email=login_value)
            else:
                user = User.objects.get(username=login_value)

        except User.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "User not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        otp = str(random.randint(100000, 999999))

        user.reset_otp = otp
        user.reset_otp_created_at = timezone.now()
        user.save()

        subject = "IndusServiceFlow - Password Reset OTP"

        message = f"""
Hello {user.name},

Your Password Reset OTP is:

{otp}

This OTP is valid for 10 minutes.

If you did not request a password reset, please ignore this email.

Thanks,
IndusServiceFlow Team
"""

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )

        except Exception:
            logger.exception(
                "Failed to send password reset OTP email for user_id=%s",
                user.id,
            )

            return Response(
                {
                    "success": False,
                    "message": (
                        "Couldn't send the OTP email right now. "
                        "Please try again in a few minutes."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        log_action(
            user,
            "Update",
            "Profile",
            target_info="Password reset OTP requested",
        )

        return Response(
            {
                "success": True,
                "message": "OTP sent successfully to your email.",
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp(request):

    serializer = VerifyOtpSerializer(data=request.data)

    if serializer.is_valid():

        data = serializer.validated_data

        login_value = data["username"]

        try:
            if "@" in login_value:
                user = User.objects.get(email=login_value)
            else:
                user = User.objects.get(username=login_value)

        except User.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "User not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        stored_otp = (user.reset_otp or "").strip()
        submitted_otp = (data["otp"] or "").strip()

        if not stored_otp or stored_otp != submitted_otp:
            return Response(
                {
                    "success": False,
                    "message": "Invalid OTP.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            user.reset_otp_created_at is None
            or timezone.now() > user.reset_otp_created_at + timedelta(minutes=10)
        ):
            return Response(
                {
                    "success": False,
                    "message": "OTP has expired.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "message": "OTP verified successfully.",
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):

    serializer = ResetPasswordSerializer(data=request.data)

    if serializer.is_valid():

        data = serializer.validated_data

        login_value = data.get("username") or data.get("email")

        try:
            if "@" in login_value:
                user = User.objects.get(email=login_value)
            else:
                user = User.objects.get(username=login_value)

        except User.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "User not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        stored_otp = (user.reset_otp or "").strip()
        submitted_otp = (data["otp"] or "").strip()

        if not stored_otp or stored_otp != submitted_otp:
            return Response(
                {
                    "success": False,
                    "message": "Invalid OTP.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            user.reset_otp_created_at is None
            or timezone.now() > user.reset_otp_created_at + timedelta(minutes=10)
        ):
            return Response(
                {
                    "success": False,
                    "message": "OTP has expired.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.check_password(data["new_password"]):
            return Response(
                {
                    "success": False,
                    "message": (
                        "New password cannot be the same as " "your current password."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(data["new_password"])

        user.reset_otp = None
        user.reset_otp_created_at = None

        user.save()

        log_action(
            user,
            "Update",
            "Profile",
            target_info="Password reset via forgot-password OTP",
        )

        return Response(
            {
                "success": True,
                "message": "Password reset successfully.",
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):

    serializer = ChangePasswordSerializer(data=request.data)

    if serializer.is_valid():

        user = request.user

        current_password = serializer.validated_data["current_password"]
        new_password = serializer.validated_data["new_password"]

        if not user.check_password(current_password):
            return Response(
                {
                    "success": False,
                    "message": "Current password is incorrect.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if current_password == new_password:
            return Response(
                {
                    "success": False,
                    "message": (
                        "New password cannot be the same as " "the current password."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)

        user.updated_by = user.username

        user.save()

        log_action(
            user,
            "Update",
            "Profile",
            target_info="Password changed",
        )

        return Response(
            {
                "success": True,
                "message": "Password changed successfully.",
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )
