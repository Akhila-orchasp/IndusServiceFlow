from django.core.paginator import Paginator
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):

    queryset = Notification.objects.select_related(
        "customer",
        "employee",
        "recipient_user",
        "appointment",
        "org",
    )

    serializer_class = NotificationSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        is_read = self.request.query_params.get("is_read")
        notification_type = self.request.query_params.get("notification_type")
        caller_role = getattr(self.request.user, "role", None)
        caller_org_id = getattr(self.request.user, "organization_id", None)

        if caller_role == "EMPLOYEE":
            queryset = queryset.filter(
                recipient_type="Employee",
                employee_id=self.request.user.id,
            )

        elif caller_role == "SUPER_ADMIN":
            queryset = queryset.filter(recipient_type="Organization")

        elif caller_role == "ORG_ADMIN":
            queryset = queryset.filter(
                recipient_type="OrganizationAdmin",
                recipient_user_id=self.request.user.id,
                org_id=caller_org_id,
            )

        else:
            return queryset.none()

        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == "true")

        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Paginated, envelope-style response — same { success, message,
        pagination, data } shape Shifts/Services/Employees already
        use, instead of handing back a bare, unpaginated array (which
        is what this endpoint used to do — every notification ever
        sent to the caller, fetched on every poll). `page_size`
        defaults to 20; the notification bell asks for its own 15
        explicitly rather than relying on that default.
        """

        queryset = self.filter_queryset(self.get_queryset())

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (TypeError, ValueError):
            page = 1

        try:
            page_size = int(request.query_params.get("page_size", 20))
        except (TypeError, ValueError):
            page_size = 20

        page_size = max(1, min(page_size, 100))

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        serializer = self.get_serializer(page_obj.object_list, many=True)

        return Response(
            {
                "success": True,
                "message": (
                    "Notifications retrieved successfully."
                    if paginator.count
                    else "No notifications found."
                ),
                "pagination": {
                    "current_page": page_obj.number,
                    "total_pages": paginator.num_pages,
                    "total_records": paginator.count,
                    "page_size": page_size,
                    "has_next": page_obj.has_next(),
                    "has_previous": page_obj.has_previous(),
                },
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):

        instance = self.get_object()
        serializer = self.get_serializer(instance)

        return Response(
            {
                "success": True,
                "message": "Notification retrieved successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):

        notification = self.get_object()

        notification.is_read = True
        notification.read_on = timezone.now()

        notification.save(
            update_fields=[
                "is_read",
                "read_on",
            ]
        )

        return Response(
            {
                "success": True,
                "message": "Notification marked as read.",
                "data": NotificationSerializer(notification).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):

        queryset = self.get_queryset().filter(is_read=False)

        updated_count = queryset.update(
            is_read=True,
            read_on=timezone.now(),
        )

        return Response(
            {
                "success": True,
                "message": (
                    f"{updated_count} notification(s) marked as read."
                    if updated_count
                    else "No unread notifications to mark."
                ),
                "marked_read": updated_count,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):

        count = self.get_queryset().filter(is_read=False).count()

        return Response(
            {
                "success": True,
                "message": "Unread count retrieved successfully.",
                "unread_count": count,
            },
            status=status.HTTP_200_OK,
        )
