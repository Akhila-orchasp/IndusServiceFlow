from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from users.models import User
from audit_logs.utils import log_action


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_profile(request):

    user = request.user

    data = {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "mobile": user.mobile,
        "organization": (
            user.organization.organization_name if user.organization else None
        ),
        "role": user.role,
        "status": user.status,
        "created_by": user.created_by,
        "created_on": user.created_on,
        "updated_by": user.updated_by,
        "updated_on": user.updated_on,
    }

    # The "Registration details" card on the org admin's My Profile page
    # (address/city/state/pincode/country/pan_number/gst_number) reads off
    # this same getOrgProfile() response, but those fields live on the
    # Organization row, not on User - so they have to be added on here
    # explicitly or the frontend just falls back to "—" for every one of
    # them, even though the data exists in the database.
    if user.organization:

        org = user.organization

        data.update({
            "address": org.address,
            "city": org.city,
            "state": org.state,
            "pincode": org.pincode,
            "country": org.country,
            "pan_number": org.pan_number,
            "gst_number": org.gst_number,
        })

    return Response(
        {"success": True, "message": "Profile retrieved successfully.", "data": data},
        status=status.HTTP_200_OK,
    )


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_profile(request):

    user = request.user

    name = request.data.get("name")
    email = request.data.get("email")
    mobile = request.data.get("mobile")

    if name:
        user.name = name

    if email:
        user.email = email

    if mobile:
        user.mobile = mobile

    user.updated_by = user.username

    user.save()

    log_action(user, "Update", "Profile")

    return Response(
        {"success": True, "message": "Profile updated successfully."},
        status=status.HTTP_200_OK,
    )


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def change_password(request):

    user = request.user

    old_password = request.data.get("old_password")

    new_password = request.data.get("new_password")

    confirm_password = request.data.get("confirm_password")

    if not user.check_password(old_password):

        return Response(
            {"success": False, "message": "Old password is incorrect."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if new_password != confirm_password:

        return Response(
            {
                "success": False,
                "message": "New password and Confirm password do not match.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)

    user.updated_by = user.username

    user.must_change_password = False

    user.save()

    log_action(user, "Update", "Profile", target_info="Password changed")

    return Response(
        {"success": True, "message": "Password changed successfully."},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def acknowledge_first_login(request):

    user = request.user

    user.must_change_password = False

    user.save()

    return Response(
        {"success": True, "message": "First login acknowledged."},
        status=status.HTTP_200_OK,
    )
