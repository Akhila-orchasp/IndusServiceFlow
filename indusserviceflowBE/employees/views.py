import logging
from datetime import datetime
from io import BytesIO

from django.contrib.auth.hashers import make_password
from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.db.models import Q, Avg, Count
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action

import pandas as pd

from .pdf_report import generate_module_report_pdf, organization_context
from common.utils import export_filename

from appointments.models import Appointment, AppointmentService
from appointments.utils import (
    get_leg_start_time,
    auto_mark_no_shows,
    employee_is_free,
    sync_appointment_status,
)
from appointments.email_utils import send_transfer_email, send_reschedule_email
from feedback.services import request_feedback_for_service
from notifications.services import notify_employee
from organizations.models import Organization

from .models import Employee, Shift, EmployeeService

from .serializers import (
    EmployeeSerializer,
    ShiftSerializer,
    EmployeeServiceSerializer,
)

from .utils import (
    generate_unique_username,
    generate_employee_code,
    calculate_employee_rating,
    get_shift_window_status,
    DEFAULT_PASSWORD,
)

from .email_utils import (
    send_employee_credentials,
    send_employee_profile_update_email,
)

from audit_logs.utils import log_action

logger = logging.getLogger(__name__)


def _success(message, data=None, status_code=status.HTTP_200_OK, extra=None):
    """
    Standard success envelope for Employee Portal endpoints:
    { success, message, data }. `extra` lets a caller merge in
    top-level keys (e.g. "pagination") alongside "data".
    """

    body = {
        "success": True,
        "message": message,
        "data": data,
    }

    if extra:
        body.update(extra)

    return Response(body, status=status_code)


def _error(message, status_code=status.HTTP_400_BAD_REQUEST, data=None):
    """
    Standard error envelope for Employee Portal endpoints:
    { success, message[, data] }.
    """

    body = {
        "success": False,
        "message": message,
    }

    if data is not None:
        body["data"] = data

    return Response(body, status=status_code)


def _paginate_list(items, request, default_page_size=200, max_page_size=500):
    """
    Paginates an already-materialized list (of dicts) the same way
    EmployeeViewSet.list() paginates a queryset, so every list the
    Employee Portal renders - queue, schedule, assigned services -
    gets the same { current_page, total_pages, total_records,
    page_size, has_next, has_previous } shape.

    Returns (page_items, pagination_dict).
    """

    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = int(request.query_params.get("page_size", default_page_size))
    except (TypeError, ValueError):
        page_size = default_page_size

    page_size = max(1, min(page_size, max_page_size))

    total_records = len(items)
    total_pages = max(1, -(-total_records // page_size)) if total_records else 1

    if page > total_pages:
        page = total_pages

    start = (page - 1) * page_size
    end = start + page_size

    pagination = {
        "current_page": page,
        "total_pages": total_pages,
        "total_records": total_records,
        "page_size": page_size,
        "has_next": page < total_pages,
        "has_previous": page > 1,
    }

    return items[start:end], pagination


def _caller_organization_id(request):
    """
    Organization id of the authenticated caller (Org Admin user or
    Employee token). Both `users.User` (via the real `organization`
    FK) and `employees.authentication.EmployeeUser` expose this as
    `.organization_id`.

    Returns None for Super Admins, who are not tied to a single
    organization.
    """
    return getattr(request.user, "organization_id", None)


def _resolve_organization_id_for_create(request):
    """
    Organization a new Employee should belong to.

    - Org Admins / Employees: always their own organization, never
      taken from client input, so a caller cannot create an employee
      under a different organization by passing a different id.
    - Super Admins: must supply "org" (an organization id) explicitly
      in the request body.
    """

    caller_org_id = _caller_organization_id(request)

    if caller_org_id is not None:
        return caller_org_id

    org_id = request.data.get("org")

    if not org_id:
        raise ValidationError(
            {
                "org": (
                    "This account is not linked to an organization. "
                    "Super Admins must supply org explicitly."
                )
            }
        )

    return org_id


class EmployeeViewSet(viewsets.ModelViewSet):

    queryset = Employee.objects.all().order_by("-employee_id")
    serializer_class = EmployeeSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):

        queryset = super().get_queryset()

        search = self.request.query_params.get("search")
        status_filter = self.request.query_params.get("status")
        shift_filter = self.request.query_params.get("shift")
        org_filter = self.request.query_params.get("org_id")
        service_filter = self.request.query_params.get("service_id")
        available_only = self.request.query_params.get("available_only")

        if search:
            queryset = queryset.filter(
                Q(employee_name__icontains=search)
                | Q(employee_code__icontains=search)
                | Q(email__icontains=search)
                | Q(mobile__icontains=search)
                | Q(designation__icontains=search)
                | Q(username__icontains=search)
            )

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if shift_filter:
            queryset = queryset.filter(shift_id=shift_filter)

        caller_org_id = _caller_organization_id(self.request)

        if caller_org_id is not None:
            queryset = queryset.filter(org_id=caller_org_id)
        elif org_filter:
            queryset = queryset.filter(org_id=org_filter)

        if service_filter:
            queryset = queryset.filter(
                employee_services__service_id=service_filter,
                employee_services__status="Active",
            ).distinct()

        if available_only and available_only.lower() in ("1", "true", "yes"):
            today = timezone.now().date()

            busy_employee_ids = AppointmentService.objects.filter(
                appointment__date=today, status="In Progress"
            ).values_list("employee_id", flat=True)

            queryset = queryset.exclude(employee_id__in=busy_employee_ids)

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Paginated, envelope-style response so the frontend gets a
        consistent { success, message, pagination, data } shape
        instead of a bare array — matching the pattern already used
        by audit logs, users and subscriptions.

        `page_size` defaults high enough that callers which don't
        care about paging (colleague pickers, header search, etc.)
        keep getting effectively the full filtered list, while the
        Employees management table can request real pages via
        `page` / `page_size`.
        """

        queryset = self.filter_queryset(self.get_queryset())

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (TypeError, ValueError):
            page = 1

        try:
            page_size = int(request.query_params.get("page_size", 1000))
        except (TypeError, ValueError):
            page_size = 1000

        page_size = max(1, min(page_size, 1000))

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        serializer = self.get_serializer(page_obj.object_list, many=True)

        return Response(
            {
                "success": True,
                "message": (
                    "Employees retrieved successfully."
                    if paginator.count
                    else "No employees found."
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

    def create(self, request, *args, **kwargs):

        data = request.data.copy()

        employee_name = data.get("employee_name")

        if not employee_name:
            return Response(
                {"message": "Employee name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        organization_id = _resolve_organization_id_for_create(request)

        username = generate_unique_username(employee_name)

        raw_password = DEFAULT_PASSWORD

        data["username"] = username
        data["password"] = make_password(raw_password)

        employee = None
        last_integrity_error = None

        for attempt in range(3):

            try:

                with transaction.atomic():

                    data["employee_code"] = generate_employee_code()

                    serializer = EmployeeSerializer(
                        data=data,
                        context={
                            **self.get_serializer_context(),
                            "org_id": organization_id,
                        },
                    )

                    serializer.is_valid(raise_exception=True)

                    actor_username = getattr(request.user, "username", "SYSTEM")

                    employee = serializer.save(
                        org_id=organization_id,
                        created_by=actor_username,
                        updated_by=actor_username,
                    )

                break

            except IntegrityError as exc:

                employee = None
                last_integrity_error = exc
                continue

        if employee is None:

            # The only uniqueness left on Employee besides the
            # auto-generated code/username is the per-organization
            # email constraint, which a concurrent request can still
            # trip after serializer validation passed. Report that
            # honestly instead of blaming the employee code.
            if "uniq_employee_email_per_org" in str(last_integrity_error):
                return Response(
                    {
                        "message": (
                            "An employee with this email already exists "
                            "in this organization."
                        ),
                        "email": [
                            "An employee with this email already exists "
                            "in this organization."
                        ],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(
                {
                    "message": (
                        "Could not create this employee due to a "
                        "conflicting employee code. Please try again."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        email_status = "sent"

        try:
            send_employee_credentials(
                employee.employee_name, employee.email, employee.username, raw_password
            )

        except Exception as e:
            email_status = str(e)
            logger.error(
                "Failed to send employee credentials email for org_id=%s, employee_id=%s",
                employee.org_id,
                employee.employee_id,
                exc_info=True,
            )

        log_action(
            request.user, "Create", "Employees", target_info=employee.employee_name
        )

        return Response(
            {
                "message": "Employee created successfully",
                "employee_id": employee.employee_id,
                "employee_code": employee.employee_code,
                "username": employee.username,
                "email_status": email_status,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):

        protected_fields = [
            "employee_id",
            "employee_code",
            "username",
            "password",
            "org",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]

        invalid_fields = [
            field for field in request.data.keys() if field in protected_fields
        ]

        if invalid_fields:
            return Response(
                {"message": "These fields cannot be updated", "fields": invalid_fields},
                status=status.HTTP_400_BAD_REQUEST,
            )

        employee = self.get_object()

        changes = []

        for field, new_value in request.data.items():

            old_value = getattr(employee, field, None)

            if str(old_value) != str(new_value):
                changes.append(
                    {
                        "field": field,
                        "old_value": str(old_value),
                        "new_value": str(new_value),
                    }
                )

        serializer = self.get_serializer(
            employee, data=request.data, partial=kwargs.pop("partial", False)
        )

        serializer.is_valid(raise_exception=True)

        serializer.save(updated_by=getattr(request.user, "username", "SYSTEM"))

        employee.refresh_from_db()

        if changes:

            try:
                send_employee_profile_update_email(
                    employee.employee_name, employee.email, changes
                )

            except Exception:
                logger.error(
                    "Failed to send employee profile update email for org_id=%s, employee_id=%s",
                    employee.org_id,
                    employee.employee_id,
                    exc_info=True,
                )

        log_action(
            request.user, "Update", "Employees", target_info=employee.employee_name
        )

        return Response(
            {
                "message": "Employee updated successfully",
                "data": EmployeeSerializer(employee).data,
            }
        )

    def destroy(self, request, *args, **kwargs):

        employee = self.get_object()

        employee.status = "Inactive"
        employee.updated_by = getattr(request.user, "username", "SYSTEM")

        employee.save()

        log_action(
            request.user, "Delete", "Employees", target_info=employee.employee_name
        )

        return Response(
            {"message": "Employee marked as inactive successfully"},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):

        employees = self.get_queryset()

        return Response(
            {
                "totalEmployees": employees.count(),
                "activeEmployees": employees.filter(status="Active").count(),
                "onHoldEmployees": employees.filter(status="On Hold").count(),
                "inactiveEmployees": employees.filter(status="Inactive").count(),
            }
        )

    @action(detail=True, methods=["get"], url_path="services")
    def services(self, request, pk=None):

        services = EmployeeService.objects.filter(employee_id=pk)

        serializer = EmployeeServiceSerializer(services, many=True)

        return Response(serializer.data)

    def _scheduled_datetime(self, row):
        """
        The full, timezone-aware moment this service leg was actually
        booked to start - the appointment's date combined with the
        leg's own sequential start time (see get_leg_start_time,
        which already accounts for earlier legs on a multi-service
        appointment running first).

        This is the correct zero-point for "how long has this
        customer waited", NOT the moment an employee happens to get
        around to calling them. A customer booked for 6:00 AM whose
        employee is running behind and only calls them at 6:20 has
        waited 20 minutes - the wait clock starts at their booked
        slot, not at whatever time the employee becomes free.
        """

        leg_time = get_leg_start_time(row)
        naive = datetime.combine(row.appointment.date, leg_time)
        return timezone.make_aware(naive, timezone.get_current_timezone())

    def _today_appointment_services(self, employee_id):
        """
        AppointmentService rows assigned to this employee, for
        today's date only. Shared by dashboard/my-queue/schedule so
        the "today" scoping stays identical across all three.
        """

        today = timezone.now().date()

        return (
            AppointmentService.objects.select_related(
                "appointment", "appointment__customer", "service"
            )
            .prefetch_related("appointment__services")
            .filter(employee_id=employee_id, appointment__date=today)
        )

    @action(detail=True, methods=["get"], url_path="dashboard")
    def dashboard(self, request, pk=None):

        employee = self.get_object()

        now_time = timezone.localtime().time()

        today_services = self._today_appointment_services(employee.employee_id)

        completed_today = today_services.filter(status="Completed")

        in_progress_today = today_services.filter(status="In Progress")

        waiting_today = today_services.filter(
            appointment__status__in=["Confirmed", "Waiting"]
        )

        upcoming_today = waiting_today.filter(appointment__time__gt=now_time)

        average_handling_time = (
            completed_today.aggregate(
                avg_duration=Avg(Coalesce("actual_duration_min", "duration_min"))
            )["avg_duration"]
            or 0
        )

        assigned_services_today = [
            {
                "appointment_id": row.appointment.appointment_id,
                "appointment_number": row.appointment.appointment_number,
                "token_number": row.appointment.token_number,
                "customer_name": row.appointment.customer.CustomerName,
                "service_name": row.service_name,
                "time": get_leg_start_time(row),
                "appointment_status": row.appointment.status,
                "service_status": row.status,
            }
            for row in today_services.order_by("appointment__time")
        ]

        shift_details = None

        if employee.shift:

            shift_details = {
                "shift_id": employee.shift.shift_id,
                "shift_name": employee.shift.shift_name,
                "start_time": employee.shift.start_time,
                "end_time": employee.shift.end_time,
                "break_start": employee.shift.break_start,
                "break_end": employee.shift.break_end,
                "status": employee.shift.status,
            }

        page_items, pagination = _paginate_list(
            assigned_services_today, request, default_page_size=200
        )

        return _success(
            "Employee dashboard retrieved successfully.",
            data={
                "customers_served_today": completed_today.values("appointment_id")
                .distinct()
                .count(),
                "customers_waiting": waiting_today.values("appointment_id")
                .distinct()
                .count(),
                "average_handling_time": round(average_handling_time, 2),
                "completed_services_today": completed_today.count(),
                "in_progress_services": in_progress_today.count(),
                "upcoming_appointments_today": upcoming_today.values("appointment_id")
                .distinct()
                .count(),
                "assigned_services_today": page_items,
                "shift": shift_details,
            },
            extra={"pagination": pagination},
        )

    @action(detail=True, methods=["get"], url_path="my-queue")
    def my_queue(self, request, pk=None):

        employee = self.get_object()
        auto_mark_no_shows(org_id=employee.org_id)

        today_services = self._today_appointment_services(employee.employee_id).exclude(
            appointment__status__in=[
                "Cancelled",
                "No Show",
                "Left Queue",
                "Completed",
            ]
        )

        current_row = (
            today_services.filter(status="In Progress")
            .order_by("appointment__time")
            .first()
        )

        current_customer = None

        if current_row:

            scheduled_dt = self._scheduled_datetime(current_row)
            waited_min = None

            if current_row.started_at:
                waited_min = max(
                    0,
                    round((current_row.started_at - scheduled_dt).total_seconds() / 60),
                )

            current_customer = {
                "appointment_id": current_row.appointment.appointment_id,
                "appointment_number": current_row.appointment.appointment_number,
                "token_number": current_row.appointment.token_number,
                "customer_name": current_row.appointment.customer.CustomerName,
                "service_id": current_row.service_id,
                "service_name": current_row.service_name,
                "appointment_status": current_row.appointment.status,
                "started_at": current_row.started_at,
                "scheduled_time": scheduled_dt,
                "waited_min": waited_min,
                "service_duration_minutes": current_row.duration_min,
            }

        waiting_rows = sorted(
            today_services.filter(status__in=["Confirmed", "Waiting"]),
            key=lambda row: int(row.appointment.token_number),
        )

        now = timezone.now()

        next_waiting_customers = [
            {
                "appointment_id": row.appointment.appointment_id,
                "appointment_number": row.appointment.appointment_number,
                "token_number": row.appointment.token_number,
                "customer_name": row.appointment.customer.CustomerName,
                "service_id": row.service_id,
                "service_name": row.service_name,
                "appointment_status": row.appointment.status,
                "queue_position": index + 1,
                "service_duration_minutes": row.duration_min,
                "scheduled_time": self._scheduled_datetime(row),
                "overdue_min": max(
                    0,
                    round((now - self._scheduled_datetime(row)).total_seconds() / 60),
                ),
            }
            for index, row in enumerate(waiting_rows)
        ]

        page_items, pagination = _paginate_list(
            next_waiting_customers, request, default_page_size=200
        )

        return _success(
            (
                "Queue retrieved successfully."
                if (current_customer or page_items)
                else "Queue is empty."
            ),
            data={
                "current_customer": current_customer,
                "next_waiting_customers": page_items,
            },
            extra={"pagination": pagination},
        )

    @action(detail=True, methods=["post"], url_path="call-next")
    def call_next(self, request, pk=None):

        employee = self.get_object()

        today = timezone.now().date()

        auto_mark_no_shows(org_id=employee.org_id, date=today)

        already_in_progress = AppointmentService.objects.filter(
            employee_id=employee.employee_id,
            appointment__date=today,
            status="In Progress",
        ).exists()

        if already_in_progress:

            return _error(
                "This employee already has a customer "
                "in progress. Complete or skip first.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        candidates = AppointmentService.objects.select_related(
            "appointment", "appointment__customer"
        ).filter(
            employee_id=employee.employee_id,
            appointment__date=today,
            status__in=["Confirmed", "Waiting"],
            appointment__status__in=["Confirmed", "Waiting", "In Progress"],
        )

        next_service = min(
            candidates, key=lambda row: int(row.appointment.token_number), default=None
        )

        if not next_service:

            return _error(
                "No waiting customers in the queue.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        appointment = next_service.appointment

        next_service.status = "In Progress"

        next_service.started_at = timezone.now()
        next_service.updated_by = getattr(request.user, "username", "SYSTEM")
        next_service.save(
            update_fields=["status", "started_at", "updated_by", "updated_on"]
        )

        appointment.status = "In Progress"
        appointment.updated_by = getattr(request.user, "username", "SYSTEM")
        appointment.save()

        return _success(
            "Next customer called successfully.",
            data={
                "appointment_id": appointment.appointment_id,
                "appointment_number": appointment.appointment_number,
                "token_number": appointment.token_number,
                "customer_name": appointment.customer.CustomerName,
                "status": appointment.status,
            },
        )

    @action(detail=True, methods=["post"], url_path="complete-customer")
    def complete_customer(self, request, pk=None):

        employee = self.get_object()

        appointment_id = request.data.get("appointment_id")
        remarks = request.data.get("remarks", "")

        if not appointment_id:
            return _error("appointment_id is required.")

        try:
            appointment = Appointment.objects.get(appointment_id=appointment_id)
        except Appointment.DoesNotExist:
            return _error(
                "Appointment not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        service_row = (
            AppointmentService.objects.filter(
                appointment_id=appointment_id,
                employee_id=employee.employee_id,
                status="In Progress",
            )
            .order_by("appointment_service_id")
            .first()
        )

        if service_row is None:
            service_row = (
                AppointmentService.objects.filter(
                    appointment_id=appointment_id,
                    employee_id=employee.employee_id,
                    status__in=["Confirmed", "Waiting"],
                )
                .order_by("appointment_service_id")
                .first()
            )

        if service_row is None:
            return _error(
                "No active service for this appointment is assigned "
                "to this employee.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        caller_username = getattr(request.user, "username", "SYSTEM")

        completed_at = timezone.now()

        service_row.status = "Completed"
        service_row.completed_at = completed_at
        if service_row.started_at:
            elapsed_seconds = (completed_at - service_row.started_at).total_seconds()
            service_row.actual_duration_min = max(1, round(elapsed_seconds / 60))

        service_row.updated_by = caller_username
        service_row.save(
            update_fields=[
                "status",
                "completed_at",
                "actual_duration_min",
                "updated_by",
                "updated_on",
            ]
        )

        if remarks:
            appointment.remarks = remarks

        # Only this leg is completed. The appointment rolls up to
        # "Completed" solely when no other leg is still outstanding -
        # the other services stay workable in the meantime.
        sync_appointment_status(appointment, actor=caller_username)

        # Per-leg, not per-appointment: this customer has finished
        # with this employee, so they can rate them now. On a
        # multi-service appointment the remaining legs each send
        # their own request when they finish - nothing is held back
        # waiting for the whole appointment to complete. Best-effort,
        # like every other post-status-change side effect here: it
        # must never block a completion that already committed.
        try:
            request_feedback_for_service(service_row)
        except Exception:
            logger.exception(
                "Failed to request feedback for appointment %s service %s",
                appointment.appointment_number,
                service_row.appointment_service_id,
            )

        return _success(
            "Service completed successfully.",
            data={
                "appointment_id": appointment.appointment_id,
                "service_id": service_row.service_id,
                "service_status": service_row.status,
                "planned_duration_min": service_row.duration_min,
                "actual_duration_min": service_row.actual_duration_min,
                "status": appointment.status,
            },
        )

    @action(detail=True, methods=["post"], url_path="skip-customer")
    def skip_customer(self, request, pk=None):

        employee = self.get_object()

        appointment_id = request.data.get("appointment_id")

        if not appointment_id:
            return _error("appointment_id is required.")

        try:
            appointment = Appointment.objects.get(appointment_id=appointment_id)
        except Appointment.DoesNotExist:
            return _error(
                "Appointment not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        service_row = (
            AppointmentService.objects.filter(
                appointment_id=appointment_id,
                employee_id=employee.employee_id,
                status="In Progress",
            )
            .order_by("appointment_service_id")
            .first()
        )

        if service_row is None:
            service_row = (
                AppointmentService.objects.filter(
                    appointment_id=appointment_id,
                    employee_id=employee.employee_id,
                    status__in=["Confirmed", "Waiting"],
                )
                .order_by("appointment_service_id")
                .first()
            )

        if service_row is None:
            return _error(
                "No active service for this appointment is assigned "
                "to this employee.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        caller_username = getattr(request.user, "username", "SYSTEM")

        service_row.status = "Left Queue"
        service_row.updated_by = caller_username
        service_row.save(update_fields=["status", "updated_by", "updated_on"])

        sync_appointment_status(appointment, actor=caller_username)

        return _success(
            "Service skipped and marked as left queue.",
            data={
                "appointment_id": appointment.appointment_id,
                "service_id": service_row.service_id,
                "service_status": service_row.status,
                "status": appointment.status,
            },
        )

    @action(detail=True, methods=["post"], url_path="reschedule-customer")
    def reschedule_customer(self, request, pk=None):
        """
        Employee-initiated reschedule for a customer still waiting in
        this employee's queue (the customer currently being served is
        handled by complete/skip instead - this only applies to
        Confirmed/Waiting rows in the queue list).

        Appointment date/time live on the Appointment as a whole, not
        per service leg, so this moves the entire appointment to the
        new slot - the same field the org-admin edit screen changes.
        The chosen slot is validated against this employee's own
        shift/breaks/bookings before saving, and the customer is
        emailed the new date/time.
        """

        employee = self.get_object()

        appointment_id = request.data.get("appointment_id")
        new_date = request.data.get("date")
        new_time = request.data.get("time")

        if not appointment_id or not new_date or not new_time:
            return _error("appointment_id, date and time are required.")

        try:
            appointment = Appointment.objects.select_related("customer").get(
                appointment_id=appointment_id
            )
        except Appointment.DoesNotExist:
            return _error(
                "Appointment not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        service_row = (
            AppointmentService.objects.filter(
                appointment_id=appointment_id,
                employee_id=employee.employee_id,
                status__in=["Confirmed", "Waiting"],
            )
            .order_by("appointment_service_id")
            .first()
        )

        if service_row is None:
            return _error(
                "No waiting service for this appointment is assigned "
                "to this employee.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        try:
            parsed_date = datetime.strptime(new_date, "%Y-%m-%d").date()
        except ValueError:
            return _error("date must be in YYYY-MM-DD format.")

        try:
            parsed_time = datetime.strptime(new_time, "%H:%M").time()
        except ValueError:
            return _error("time must be in HH:MM format.")

        start_min = parsed_time.hour * 60 + parsed_time.minute

        now_min = None
        if parsed_date == timezone.localdate():
            now = timezone.localtime()
            now_min = now.hour * 60 + now.minute

        if not employee_is_free(
            employee,
            parsed_date,
            start_min,
            service_row.duration_min,
            now_min=now_min,
            exclude_appointment_id=appointment.appointment_id,
        ):
            return _error(
                "That slot is no longer available for this employee. "
                "Please pick a different time.",
                status_code=status.HTTP_409_CONFLICT,
            )

        caller_username = getattr(request.user, "username", "SYSTEM")

        old_date, old_time = appointment.date, appointment.time

        appointment.date = parsed_date
        appointment.time = parsed_time

        appointment.status = "Confirmed"
        appointment.updated_by = caller_username
        appointment.save()

        service_row.status = "Confirmed"
        service_row.updated_by = caller_username
        service_row.save(update_fields=["status", "updated_by", "updated_on"])

        try:
            send_reschedule_email(appointment.customer, appointment, old_date, old_time)
        except Exception:
            logger.exception(
                "Failed to send reschedule email for appointment %s",
                appointment.appointment_number,
            )

        return _success(
            "Appointment rescheduled successfully.",
            data={
                "appointment_id": appointment.appointment_id,
                "date": appointment.date,
                "time": appointment.time,
                "status": appointment.status,
            },
        )

    @action(detail=True, methods=["post"], url_path="transfer-customer")
    def transfer_customer(self, request, pk=None):

        employee = self.get_object()

        appointment_id = request.data.get("appointment_id")
        new_employee_id = request.data.get("employee_id")

        if not appointment_id or not new_employee_id:

            return _error("appointment_id and employee_id are required.")

        assigned_services = AppointmentService.objects.filter(
            appointment_id=appointment_id,
            employee_id=employee.employee_id,
            status__in=["Confirmed", "Waiting", "In Progress"],
        )

        if not assigned_services.exists():

            return _error(
                "This appointment has no transferable services "
                "assigned to this employee.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        try:

            new_employee = Employee.objects.get(
                employee_id=new_employee_id, org_id=employee.org_id
            )

        except Employee.DoesNotExist:

            return _error(
                "Target employee not found in your organization.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        if new_employee.status != "Active":

            return _error("Target employee is not available for transfer.")
        if get_shift_window_status(new_employee.shift) != "on_shift":

            return _error(
                "Target employee's shift has not started or has " "already ended."
            )

        transferable_service_ids = list(
            assigned_services.values_list("service_id", flat=True).distinct()
        )

        qualified_service_ids = set(
            EmployeeService.objects.filter(
                employee_id=new_employee.employee_id,
                service_id__in=transferable_service_ids,
                status="Active",
            ).values_list("service_id", flat=True)
        )

        if not set(transferable_service_ids).issubset(qualified_service_ids):

            return _error(
                "Target employee is not qualified for one or more "
                "of the services being transferred."
            )

        caller_username = getattr(request.user, "username", "SYSTEM")

        appointment = assigned_services.first().appointment
        transferred_service_names = list(
            assigned_services.values_list("service_name", flat=True)
        )

        for row in assigned_services:
            row.employee = new_employee
            row.updated_by = caller_username
            if row.status == "In Progress":
                row.status = "Waiting"
                row.started_at = None
            row.save()

        appointment.refresh_from_db()

        sync_appointment_status(appointment, actor=caller_username)

        try:
            send_transfer_email(
                appointment.customer,
                appointment,
                employee,
                new_employee,
                transferred_service_names,
            )
        except Exception:
            logger.exception(
                "Failed to send transfer notification email for " "appointment %s",
                appointment.appointment_id,
            )

        try:
            notify_employee(
                employee=new_employee,
                title="Customer Transferred to You",
                message=(
                    f"{employee.employee_name} transferred "
                    f"{appointment.customer.CustomerName} "
                    f"(Token {appointment.token_number}) to you for "
                    f"{', '.join(transferred_service_names)}."
                ),
                notification_type="Appointment Status Update",
                appointment=appointment,
                actor=request.user,
            )
        except Exception:
            logger.exception(
                "Failed to create transfer notification for employee "
                "%s on appointment %s",
                new_employee.employee_id,
                appointment.appointment_id,
            )

        return _success(
            "Customer transferred successfully.",
            data={
                "appointment_id": int(appointment_id),
                "transferred_to_employee_id": new_employee.employee_id,
                "status": appointment.status,
            },
        )

    @action(detail=True, methods=["get"], url_path="schedule")
    def schedule(self, request, pk=None):

        employee = self.get_object()

        today_services = self._today_appointment_services(
            employee.employee_id
        ).order_by("appointment__time")

        shift_details = None

        if employee.shift:

            shift_details = {
                "shift_id": employee.shift.shift_id,
                "shift_name": employee.shift.shift_name,
                "start_time": employee.shift.start_time,
                "end_time": employee.shift.end_time,
                "break_start": employee.shift.break_start,
                "break_end": employee.shift.break_end,
                "duration_hours": employee.shift.duration_hours,
                "status": employee.shift.status,
            }

        appointments_today = [
            {
                "appointment_id": row.appointment.appointment_id,
                "appointment_number": row.appointment.appointment_number,
                "token_number": row.appointment.token_number,
                "time": get_leg_start_time(row),
                "customer_name": row.appointment.customer.CustomerName,
                "service_name": row.service_name,
                "appointment_status": row.appointment.status,
                "service_status": row.status,
            }
            for row in today_services
        ]

        page_items, pagination = _paginate_list(
            appointments_today, request, default_page_size=200
        )

        return _success(
            (
                "Schedule retrieved successfully."
                if page_items
                else "No appointments scheduled for today."
            ),
            data={
                "shift": shift_details,
                "appointments_today": page_items,
            },
            extra={"pagination": pagination},
        )

    @action(detail=True, methods=["get"], url_path="performance")
    def performance(self, request, pk=None):

        employee = self.get_object()

        today = timezone.now().date()

        services = AppointmentService.objects.filter(employee_id=employee.employee_id)

        total_assigned_appointments = (
            services.values("appointment_id").distinct().count()
        )

        completed_appointments = (
            services.filter(appointment__status="Completed")
            .values("appointment_id")
            .distinct()
            .count()
        )

        customers_served_today = (
            services.filter(appointment__status="Completed", appointment__date=today)
            .values("appointment_id")
            .distinct()
            .count()
        )

        cancelled_count = (
            services.filter(appointment__status="Cancelled")
            .values("appointment_id")
            .distinct()
            .count()
        )

        no_show_count = (
            services.filter(appointment__status="No Show")
            .values("appointment_id")
            .distinct()
            .count()
        )

        left_queue_count = (
            services.filter(appointment__status="Left Queue")
            .values("appointment_id")
            .distinct()
            .count()
        )

        average_service_duration = (
            services.filter(status="Completed").aggregate(
                avg_duration=Avg(Coalesce("actual_duration_min", "duration_min"))
            )["avg_duration"]
            or 0
        )

        completion_rate = (
            (completed_appointments / total_assigned_appointments) * 100
            if total_assigned_appointments
            else 0
        )

        return _success(
            "Performance metrics retrieved successfully.",
            data={
                "total_customers_served": completed_appointments,
                "customers_served_today": customers_served_today,
                "average_service_duration": round(average_service_duration, 2),
                "completion_rate": round(completion_rate, 2),
                "cancelled_count": cancelled_count,
                "no_show_count": no_show_count,
                "left_queue_count": left_queue_count,
                "total_assigned_appointments": total_assigned_appointments,
                "completed_appointments": completed_appointments,
                "rating": calculate_employee_rating(employee),
            },
        )

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):

        employees = self.get_queryset().select_related("shift")

        data = [
            {
                "Employee Code": emp.employee_code,
                "Employee Name": emp.employee_name,
                "Email": emp.email,
                "Mobile": emp.mobile,
                "Designation": emp.designation,
                "Shift": emp.shift.shift_name if emp.shift else "Unassigned",
                "Status": emp.status,
            }
            for emp in employees
        ]

        df = pd.DataFrame(data)

        response = HttpResponse(content_type="text/csv")

        filename = export_filename("employees", "csv")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        df.to_csv(response, index=False)

        log_action(request.user, "Export", "Employees")
        return response

    @action(detail=False, methods=["get"], url_path="export-excel")
    def export_excel(self, request):

        employees = self.get_queryset().select_related("shift")

        data = [
            {
                "Employee Code": emp.employee_code,
                "Employee Name": emp.employee_name,
                "Email": emp.email,
                "Mobile": emp.mobile,
                "Designation": emp.designation,
                "Shift": emp.shift.shift_name if emp.shift else "Unassigned",
                "Status": emp.status,
            }
            for emp in employees
        ]

        df = pd.DataFrame(data)

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

        filename = export_filename("employees", "xlsx")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        with pd.ExcelWriter(response, engine="openpyxl") as writer:

            df.to_excel(writer, sheet_name="Employees", index=False)

        log_action(request.user, "Export", "Employees")
        return response

    @action(detail=False, methods=["get"], url_path="export-pdf")
    def export_pdf(self, request):

        employees = self.get_queryset().select_related("shift")

        org_id = _caller_organization_id(request) or request.query_params.get("org_id")
        organization = organization_context(org_id)

        total_employees = employees.count()
        active_employees = employees.filter(status="Active").count()
        inactive_employees = total_employees - active_employees

        service_stats = AppointmentService.objects.filter(
            employee__in=employees
        ).aggregate(
            total_assigned=Count("appointment_service_id"),
            completed=Count("appointment_service_id", filter=Q(status="Completed")),
        )
        total_assigned = service_stats["total_assigned"] or 0
        completed = service_stats["completed"] or 0
        completion_rate = (
            round((completed / total_assigned * 100), 1) if total_assigned else 0.0
        )

        kpi_cards = [
            {
                "label": "Total Employees",
                "value": total_employees,
                "sublabel": "In this organization",
            },
            {
                "label": "Active",
                "value": active_employees,
                "sublabel": "Currently active",
            },
            {
                "label": "Inactive",
                "value": inactive_employees,
                "sublabel": "Currently inactive",
            },
            {
                "label": "Completion Rate",
                "value": f"{completion_rate}%",
                "sublabel": f"{completed} of {total_assigned} assigned",
            },
        ]

        rows = [
            [
                emp.employee_code,
                emp.employee_name,
                emp.email,
                emp.mobile,
                emp.designation,
                emp.shift.shift_name if emp.shift else "Unassigned",
                emp.status,
            ]
            for emp in employees
        ]

        sections = [
            {
                "title": "Employee Directory",
                "headers": [
                    "Code",
                    "Name",
                    "Email",
                    "Mobile",
                    "Designation",
                    "Shift",
                    "Status",
                ],
                "rows": rows,
                "status_cols": {6},
            }
        ]

        buffer = BytesIO()
        generate_module_report_pdf(
            buffer,
            "EMPLOYEES REPORT",
            "Staff Directory & Performance Insights",
            organization,
            sections,
            kpi_title="Summary",
            kpi_cards=kpi_cards,
        )
        buffer.seek(0)

        response = HttpResponse(buffer.read(), content_type="application/pdf")

        filename = export_filename("employees", "pdf")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        log_action(request.user, "Export", "Employees")
        return response


class ShiftViewSet(viewsets.ModelViewSet):

    queryset = Shift.objects.all().order_by("shift_id")

    serializer_class = ShiftSerializer

    def _resolve_org_id(self):
        """
        Organization this request is scoped to: the caller's own
        organization for an Org Admin / Employee, or an explicit
        org_id query param otherwise (Super Admin tooling). Returns
        None if it can't be resolved (e.g. Super Admin managing
        global template shifts).
        """

        caller_org_id = _caller_organization_id(self.request)

        if caller_org_id is not None:
            return caller_org_id

        org_filter = self.request.query_params.get("org_id")

        if org_filter:
            return org_filter

        return None

    def _resolve_category_id(self, org_id=None):
        """
        Category of the organization this request is scoped to (e.g.
        "Hospitals"), used only to let a genuinely category-wide
        template shift (one created with no org, for that category)
        show up for every org in that category — never to widen
        visibility to other organizations' own shifts, and never to
        other categories' template shifts.
        """

        if org_id is not None:
            return (
                Organization.objects.filter(pk=org_id)
                .values_list("category_id", flat=True)
                .first()
            )

        category_filter = self.request.query_params.get("category_id")

        if category_filter:
            return category_filter

        return None

    def get_queryset(self):

        queryset = super().get_queryset()

        org_id = self._resolve_org_id()

        if org_id is not None:
            category_id = self._resolve_category_id(org_id)

            queryset = queryset.filter(
                Q(org_id=org_id)
                | Q(org_id__isnull=True, category_id=category_id)
                | Q(org_id__isnull=True, category_id__isnull=True)
            )
        else:
            category_filter = self.request.query_params.get("category_id")

            if category_filter:
                queryset = queryset.filter(
                    Q(category_id=category_filter) | Q(category_id__isnull=True)
                )

        search = self.request.query_params.get("search")
        status_filter = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(shift_name__icontains=search)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Paginated, envelope-style response — same { success, message,
        pagination, data } shape Services/Employees/Customers already
        use, instead of handing back a bare array. `page_size`
        defaults high enough that callers which don't care about
        paging (e.g. an employee-form shift picker) still effectively
        get the full filtered list, while a future Shifts management
        table can request real pages via `page` / `page_size`.
        """

        queryset = self.filter_queryset(self.get_queryset())

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (TypeError, ValueError):
            page = 1

        try:
            page_size = int(request.query_params.get("page_size", 9))
        except (TypeError, ValueError):
            page_size = 9

        page_size = max(1, min(page_size, 1000))

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        serializer = self.get_serializer(page_obj.object_list, many=True)

        return Response(
            {
                "success": True,
                "message": (
                    "Shifts retrieved successfully."
                    if paginator.count
                    else "No shifts found."
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
        """
        Same { success, message, data } envelope as the write actions,
        for consistency with the rest of this API.
        """

        instance = self.get_object()
        serializer = self.get_serializer(instance)

        return Response(
            {
                "success": True,
                "message": "Shift retrieved successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def perform_create(self, serializer):
        """
        A shift created by an Org Admin (or Employee token) is always
        scoped to that caller's own organization, never left null
        (which would otherwise make it visible/bookable org-wide
        across every other org, including ones in a different
        category) and never taken from client input, mirroring how
        Employee creation pins the organization server-side rather
        than trusting the request body.

        Super Admin callers may still pass org_id as a query param to
        create a shift for a specific organization (or omit it to
        create an org-less global template shift, visible to every
        organization).

        category_id is still recorded (for reporting / legacy
        filtering) but no longer used to scope visibility.
        """

        org_id = self._resolve_org_id()
        category_id = self._resolve_category_id(org_id)

        username = (
            self.request.user.username
            if self.request.user.is_authenticated
            else "System"
        )

        serializer.save(
            org_id=org_id,
            category_id=category_id,
            created_by=username,
            updated_by=username,
        )

    def perform_update(self, serializer):

        username = (
            self.request.user.username
            if self.request.user.is_authenticated
            else "System"
        )

        serializer.save(updated_by=username)

    def _check_duplicate_timings(
        self, org_id, category_id, start_time, end_time, exclude_pk=None
    ):
        """
        Raise a validation error if the shift's start/end times
        duplicate any shift the owner can already see.

        For an org-owned shift, "owner" means everything that org can
        view: its own org-scoped shifts *and* any category-wide or
        fully-global template shift visible to it — the exact same
        visibility rules as get_queryset(). A default/category shift
        an org can already see and assign to its employees is
        effectively already "its" shift for scheduling purposes, so
        creating (or editing) an org shift with those same timings
        would be an indistinguishable duplicate in that org's shift
        list, whether the clash is against one of the org's own
        shifts or a default/category-based one it merely inherits.

        For an org-less template shift (org_id is None), "owner" means
        its own category bucket: scoped to org_id__isnull=True AND the
        same category_id (None counts as its own bucket, for a
        template shared globally rather than per-category). Without
        this, a category's default shift would collide with an
        unrelated category's default shift just because they happen
        to share a time - two different categories' defaults are not
        duplicates of each other.

        Two shifts sharing a name-irrelevant identical time slot
        *within what the same owner can see* is still worth blocking,
        since that's confusing for whoever manages them and ambiguous
        for booking/scheduling.
        """

        if org_id is not None:
            visibility = (
                Q(org_id=org_id)
                | Q(org_id__isnull=True, category_id=category_id)
                | Q(org_id__isnull=True, category_id__isnull=True)
            )
        else:
            visibility = Q(org_id__isnull=True, category_id=category_id)

        duplicates = Shift.objects.filter(
            visibility, start_time=start_time, end_time=end_time
        )

        if exclude_pk is not None:
            duplicates = duplicates.exclude(pk=exclude_pk)

        existing = duplicates.first()

        if existing is not None:
            raise ValidationError(
                {
                    "start_time": [
                        f"A shift with these start and end times already "
                        f"exists ('{existing.shift_name}')."
                    ],
                    "end_time": [
                        f"A shift with these start and end times already "
                        f"exists ('{existing.shift_name}')."
                    ],
                }
            )

    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        org_id = self._resolve_org_id()
        category_id = self._resolve_category_id(org_id)

        self._check_duplicate_timings(
            org_id,
            category_id,
            serializer.validated_data.get("start_time"),
            serializer.validated_data.get("end_time"),
        )

        self.perform_create(serializer)

        log_action(
            request.user,
            "Create",
            "Shift",
            target_info=serializer.data.get("shift_name"),
        )

        return Response(
            {
                "message": "Shift created successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):

        partial = kwargs.pop("partial", False)

        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        serializer.is_valid(raise_exception=True)

        start_time = serializer.validated_data.get("start_time", instance.start_time)
        end_time = serializer.validated_data.get("end_time", instance.end_time)

        # Only re-run the duplicate check if the times are actually
        # changing. Two *other* shifts can legitimately end up with
        # identical timings (e.g. two differently-named shifts that
        # both happen to run 9am-6pm) without either of them being a
        # duplicate of the one being edited. If we always re-validated
        # against every visible shift, saving *any* unrelated field
        # (name, status, break) on a shift that already shared its
        # timings with another one would be permanently blocked, even
        # though nothing about the timings changed in this request.
        times_changed = (
            start_time != instance.start_time or end_time != instance.end_time
        )

        if times_changed:
            self._check_duplicate_timings(
                instance.org_id,
                instance.category_id,
                start_time,
                end_time,
                exclude_pk=instance.pk,
            )

        self.perform_update(serializer)

        log_action(
            request.user,
            "Update",
            "Shift",
            target_info=serializer.data.get("shift_name"),
        )

        return Response(
            {
                "message": "Shift updated successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        shift_name = instance.shift_name
        affected_employees = instance.employee_set.filter(status="Active").count()

        instance.delete()

        log_action(request.user, "Delete", "Shift", target_info=shift_name)

        return Response(
            {
                "message": "Shift deleted successfully.",
                "affected_employees": affected_employees,
            },
            status=status.HTTP_200_OK,
        )


class EmployeeServiceViewSet(viewsets.ModelViewSet):

    queryset = EmployeeService.objects.all().order_by("-employee_service_id")

    serializer_class = EmployeeServiceSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):

        queryset = super().get_queryset()

        org_filter = self.request.query_params.get("org_id")

        caller_org_id = _caller_organization_id(self.request)

        if caller_org_id is not None:
            queryset = queryset.filter(employee__org_id=caller_org_id)
        elif org_filter:
            queryset = queryset.filter(employee__org_id=org_filter)

        return queryset