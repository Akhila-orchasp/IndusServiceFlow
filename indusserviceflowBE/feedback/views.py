from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import FeedbackRequest
from .serializers import FeedbackFormSerializer, FeedbackSubmitSerializer


def _get_feedback_request(token):

    try:
        return FeedbackRequest.objects.select_related(
            "appointment",
            "appointment__customer",
            "appointment__org",
        ).get(token=token)

    except FeedbackRequest.DoesNotExist:
        return None


@api_view(["GET"])
@permission_classes([AllowAny])
def feedback_form_view(request, token):
    """
    Public, unauthenticated endpoint the customer's browser hits when
    they click the link in the feedback email.
    """

    feedback_request = _get_feedback_request(token)

    if feedback_request is None:
        return Response(
            {"message": "This feedback link is invalid."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if feedback_request.expires_on < timezone.now():
        return Response(
            {"message": "This feedback link has expired."},
            status=status.HTTP_410_GONE,
        )

    serializer = FeedbackFormSerializer(feedback_request)

    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def feedback_submit_view(request, token):
    """
    Public, unauthenticated endpoint that stores the customer's
    ratings. Expects: {"ratings": [{"appointment_service_id": 1,
    "rating": 5, "comment": "..."}, ...]}
    """

    feedback_request = _get_feedback_request(token)

    if feedback_request is None:
        return Response(
            {"message": "This feedback link is invalid."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if feedback_request.expires_on < timezone.now():
        return Response(
            {"message": "This feedback link has expired."},
            status=status.HTTP_410_GONE,
        )

    if feedback_request.is_submitted:
        return Response(
            {"message": "Feedback has already been submitted for this appointment."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = FeedbackSubmitSerializer(
        data=request.data,
        context={"feedback_request": feedback_request},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()

    return Response(
        {"message": "Thank you for your feedback!"},
        status=status.HTTP_201_CREATED,
    )
