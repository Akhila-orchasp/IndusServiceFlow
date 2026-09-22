import logging
from datetime import date as date_cls, time as dt_time
from decimal import Decimal
from io import BytesIO
import json
import re
import pandas as pd
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from .pdf_report import generate_module_report_pdf, organization_context
from common.utils import export_filename
from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from employees.models import Employee, EmployeeService
from organizations.models import Organization
from services.models import Service
from .email_utils import (
    send_appointment_confirmation_email,
    send_appointment_status_update_email,
)
from notifications.services import notify_customer, notify_employee
from .models import Appointment, AppointmentService
from .serializers import (
    AppointmentSerializer,
    AppointmentServiceSerializer,
)
from .utils import (
    calculate_total_duration,
    calculate_total_fee,
    compute_available_slots,
    employee_is_free,
    generate_appointment_number,
    generate_token_number,
    get_or_create_customer,
    auto_mark_no_shows,
    OPEN_SERVICE_STATUSES,
    TERMINAL_SERVICE_STATUSES,
    sync_appointment_status,
)
from audit_logs.utils import log_action
from feedback.services import (
    request_feedback_for_service,
    request_feedback_for_appointment,
)

logger = logging.getLogger(__name__)

MAX_BOOKING_ATTEMPTS = 3
SLOT_FREEING_STATUSES = ["Cancelled", "No Show", "Left Queue"]

# Statuses that close an appointment outright, and so must be pushed
# down onto any service leg still open underneath it.
CLOSING_STATUSES = SLOT_FREEING_STATUSES + ["Completed"]
WALK_IN_REGEX = r"walk[\s-]?in"
MOBILE_REGEX = re.compile(r"^[6-9]\d{9}$")
SORT_FIELD_MAP = {
    "token_number": ["token_number"],
    "customer_name": ["customer__CustomerName"],
    "date": ["date", "time"],
    "time": ["time"],
}


class AppointmentViewSet(viewsets.ModelViewSet):

    queryset = (
        Appointment.objects.select_related("customer").all().order_by("-appointment_id")
    )

    serializer_class = AppointmentSerializer

    lookup_field = "appointment_id"

    def get_permissions(self):
        if self.action in ("create", "available_slots"):
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):

        queryset = super().get_queryset()

        org_id = self.request.query_params.get("org_id")
        status_filter = self.request.query_params.get("status")
        date_filter = self.request.query_params.get("date")
        from_date = self.request.query_params.get("from_date")
        to_date = self.request.query_params.get("to_date")
        search = self.request.query_params.get("search")
        type_filter = self.request.query_params.get("type")

        if org_id:
            queryset = queryset.filter(org_id=org_id)

        caller_org_id = getattr(self.request.user, "organization_id", None)

        if caller_org_id is not None:
            queryset = queryset.filter(org_id=caller_org_id)

        if status_filter:

            statuses = [
                value.strip() for value in status_filter.split(",") if value.strip()
            ]

            queryset = queryset.filter(status__in=statuses)

        if date_filter:
            queryset = queryset.filter(date=date_filter)

        if from_date and to_date:
            queryset = queryset.filter(date__range=[from_date, to_date])
        elif from_date:
            queryset = queryset.filter(date__gte=from_date)
        elif to_date:
            queryset = queryset.filter(date__lte=to_date)

        if search:
            queryset = queryset.filter(
                Q(appointment_number__icontains=search)
                | Q(token_number__icontains=search)
                | Q(customer__CustomerName__icontains=search)
                | Q(customer__Mobile__icontains=search)
            )

        if type_filter in ("Scheduled", "Walk-in"):
            walk_in = Q(remarks__iregex=WALK_IN_REGEX)
            queryset = (
                queryset.filter(walk_in)
                if type_filter == "Walk-in"
                else queryset.exclude(walk_in)
            )

        return queryset

    def _ordered_queryset(self):
        """Applies sort_by/sort_dir (defaulting to newest-first) to the
        filtered queryset, before it's sliced into a page."""

        queryset = self.filter_queryset(self.get_queryset())

        sort_by = self.request.query_params.get("sort_by")
        sort_dir = self.request.query_params.get("sort_dir", "asc")

        fields = SORT_FIELD_MAP.get(sort_by)

        if not fields:
            return queryset

        prefix = "-" if sort_dir == "desc" else ""
        return queryset.order_by(*[f"{prefix}{field}" for field in fields])

    def list(self, request, *args, **kwargs):
        """
        Paginated, envelope-style response — the same { success, message,
        pagination, data } shape the Customers/Employees endpoints use, so
        the Appointments table is driven off real backend pages instead of
        fetching every matching row and slicing/sorting it client-side.
        """

        caller_org_id = getattr(request.user, "organization_id", None)
        org_id_param = request.query_params.get("org_id")
        auto_mark_no_shows(org_id=caller_org_id or org_id_param)

        queryset = self._ordered_queryset()

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (TypeError, ValueError):
            page = 1

        try:
            page_size = int(request.query_params.get("page_size", 10))
        except (TypeError, ValueError):
            page_size = 10

        page_size = max(1, min(page_size, 200))

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        serializer = self.get_serializer(page_obj.object_list, many=True)

        return Response(
            {
                "success": True,
                "message": (
                    "Appointments retrieved successfully."
                    if paginator.count
                    else "No appointments found."
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

    @action(detail=False, methods=["get"], url_path="available-slots")
    def available_slots(self, request):
        """
        Return the time slots on a given date where the requested
        service(s) can actually be booked, instead of a fixed
        09:00-17:30 grid.

        A slot is only returned when, for every requested service,
        a qualified employee is free for that service's full
        duration — i.e. within their shift hours and not already
        booked (accounting for the duration of their existing
        appointments, not just an exact time match).

        Query params:
          date (required)          "YYYY-MM-DD"
          org_id (required unless the caller is an authenticated
                   Org Admin / Employee, in which case their own
                   organization is used and any org_id passed is
                   ignored)
          assignments (optional)   JSON list of
                   [{"service_id": 1, "employee_id": 5}, ...] —
                   used by the org-admin screen, where staff pick a
                   specific employee per service. That employee's
                   shift/bookings are checked directly.
          service_ids (optional)   comma-separated service ids —
                   used by the public booking page, where no
                   employee is chosen yet. Every Active employee
                   qualified for that service is considered, and the
                   slot is available if any one of them is free.

          Exactly one of `assignments` / `service_ids` must be given.
          interval_min (optional) — step between candidate slot
                   start times. Defaults to the requested service(s)'
                   own total duration (so slots line up with how
                   long the appointment actually takes) rather than
                   a fixed grid; pass this to override.
        """

        date = request.query_params.get("date")

        if not date:
            return Response(
                {"message": "date is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        caller_org_id = getattr(request.user, "organization_id", None)

        if caller_org_id is not None:
            org_id = caller_org_id
        else:
            org_id = request.query_params.get("org_id")

        if not org_id:
            return Response(
                {"message": "org_id is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        interval_min_raw = request.query_params.get("interval_min")

        if interval_min_raw:
            try:
                interval_min = int(interval_min_raw)
            except (TypeError, ValueError):
                interval_min = None
        else:

            interval_min = None

        assignments_raw = request.query_params.get("assignments")
        service_ids_raw = request.query_params.get("service_ids")

        duration_lookup = {}
        candidate_employees_by_key = {}

        if assignments_raw:

            try:
                assignments = json.loads(assignments_raw)
            except (TypeError, ValueError):
                return Response(
                    {"message": "assignments must be valid JSON."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            service_ids = [item.get("service_id") for item in assignments]

            services_by_id = {
                s.service_id: s
                for s in Service.objects.filter(
                    service_id__in=service_ids, status="Active"
                )
            }

            employee_ids = [
                item.get("employee_id")
                for item in assignments
                if item.get("employee_id")
            ]

            employees_by_id = {
                e.employee_id: e
                for e in Employee.objects.select_related("shift").filter(
                    employee_id__in=employee_ids,
                    org_id=org_id,
                )
            }

            for index, item in enumerate(assignments):

                service = services_by_id.get(item.get("service_id"))
                employee = employees_by_id.get(item.get("employee_id"))

                if service is None or employee is None:
                    continue

                key = f"{index}:{service.service_id}"
                duration_lookup[key] = service.duration
                candidate_employees_by_key[key] = [employee]

        elif service_ids_raw:

            service_ids = [
                sid.strip() for sid in service_ids_raw.split(",") if sid.strip()
            ]

            services_by_id = {
                s.service_id: s
                for s in Service.objects.filter(
                    service_id__in=service_ids, status="Active"
                )
            }

            qualified_employees = (
                Employee.objects.select_related("shift")
                .filter(
                    org_id=org_id,
                    status="Active",
                    employee_services__service_id__in=service_ids,
                    employee_services__status="Active",
                )
                .distinct()
            )

            employees_by_service = {}

            for link in EmployeeService.objects.filter(
                service_id__in=service_ids,
                status="Active",
                employee__in=qualified_employees,
            ).select_related("employee", "employee__shift"):

                employees_by_service.setdefault(link.service_id, []).append(
                    link.employee
                )

            for raw_id in service_ids:

                try:
                    service = services_by_id.get(int(raw_id))
                except (TypeError, ValueError):
                    service = None

                if service is None:
                    continue

                key = str(service.service_id)
                duration_lookup[key] = service.duration
                candidate_employees_by_key[key] = employees_by_service.get(
                    service.service_id, []
                )

        else:
            return Response(
                {"message": ("Provide either assignments or service_ids.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not duration_lookup:
            return Response({"date": date, "available_slots": []})

        now_min = None

        today = timezone.localdate()

        if str(date) == str(today):
            now = timezone.localtime()
            now_min = now.hour * 60 + now.minute

        available = compute_available_slots(
            date=date,
            duration_lookup=duration_lookup,
            candidate_employees_by_key=candidate_employees_by_key,
            interval_min=interval_min,
            now_min=now_min,
        )

        return Response(
            {
                "date": date,
                "available_slots": available,
            }
        )

    def create(self, request, *args, **kwargs):

        data = request.data

        is_public_booking = not request.user.is_authenticated

        required_fields = [
            "org_id",
            "customer_name",
            "mobile",
            "date",
            "time",
            "services",
        ]

        if is_public_booking:
            required_fields.append("email")

        missing = [field for field in required_fields if not data.get(field)]

        if missing:
            return Response(
                {"message": "Missing required fields.", "fields": missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = str(data.get("email")).strip() if data.get("email") else ""

        if email:
            try:
                validate_email(email)
            except DjangoValidationError:
                return Response(
                    {"message": "Enter a valid email address.", "fields": ["email"]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        mobile = str(data.get("mobile")).strip()

        if not MOBILE_REGEX.match(mobile):
            return Response(
                {
                    "message": "Enter a valid 10-digit mobile number.",
                    "fields": ["mobile"],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            appointment_date = date_cls.fromisoformat(str(data.get("date")))
        except ValueError:
            return Response(
                {"message": "date must be in YYYY-MM-DD format.", "fields": ["date"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            hour_str, minute_str = str(data.get("time")).split(":")[:2]
            appointment_time = dt_time(int(hour_str), int(minute_str))
        except (TypeError, ValueError):
            return Response(
                {"message": "time must be in HH:MM format.", "fields": ["time"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.localtime()

        if is_public_booking and (
            appointment_date < now.date()
            or (appointment_date == now.date() and appointment_time < now.time())
        ):
            return Response(
                {"message": "Cannot book an appointment in the past."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        services_payload = data.get("services")

        if not isinstance(services_payload, list) or len(services_payload) == 0:
            return Response(
                {"message": "At least one service is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service_id_list = [item.get("service_id") for item in services_payload]

        if len(service_id_list) != len(set(service_id_list)):
            return Response(
                {"message": "The same service was selected more than once."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        org_id = data.get("org_id")

        if not Organization.objects.filter(pk=org_id, status="Active").exists():
            return Response(
                {"message": f"Organization {org_id} not found or not active."},
                status=status.HTTP_404_NOT_FOUND,
            )

        customer = get_or_create_customer(
            org_id=org_id,
            customer_name=data.get("customer_name"),
            mobile=mobile,
            email=email or None,
            gender=data.get("gender"),
            created_by="SYSTEM",
        )

        appointment_services = []
        services = []

        for item in services_payload:

            service_id = item.get("service_id")

            if not service_id:
                return Response(
                    {"message": "service_id is required for every service."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:

                service = Service.objects.get(service_id=service_id, status="Active")

            except Service.DoesNotExist:

                return Response(
                    {"message": f"Service {service_id} not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            employee = None

            employee_id = item.get("employee_id")

            if employee_id:

                employee = Employee.objects.filter(employee_id=employee_id).first()

            appointment_services.append(
                {
                    "service": service,
                    "employee": employee,
                }
            )

            services.append(service)

        total_fee = calculate_total_fee(services)
        total_duration = calculate_total_duration(services)
        auto_assign_candidates_by_service = {}

        for item in appointment_services:

            if item["employee"] is not None:
                continue

            service_id = item["service"].service_id

            if service_id in auto_assign_candidates_by_service:
                continue

            auto_assign_candidates_by_service[service_id] = list(
                Employee.objects.filter(
                    org_id=org_id,
                    status="Active",
                    employee_services__service_id=service_id,
                    employee_services__status="Active",
                )
                .distinct()
                .order_by("employee_id")
            )

        employee_ids = {
            item["employee"].employee_id
            for item in appointment_services
            if item["employee"]
        }

        auto_assign_candidate_ids = {
            employee.employee_id
            for candidates in auto_assign_candidates_by_service.values()
            for employee in candidates
        }

        lockable_employee_ids = employee_ids | auto_assign_candidate_ids

        auto_assign_leg_indices = [
            index
            for index, item in enumerate(appointment_services)
            if item["employee"] is None
        ]

        appointment = None
        service_rows = []

        for attempt in range(MAX_BOOKING_ATTEMPTS):

            for index in auto_assign_leg_indices:
                appointment_services[index]["employee"] = None

            try:

                with transaction.atomic():

                    list(
                        Employee.objects.select_for_update().filter(
                            employee_id__in=lockable_employee_ids
                        )
                    )

                    requested_start_min = int(
                        data.get("time").split(":")[0]
                    ) * 60 + int(data.get("time").split(":")[1])
                    conflict = None
                    no_staff_for = None
                    running_offset = 0

                    for item in appointment_services:

                        duration_min = item["service"].duration
                        leg_start_min = requested_start_min + running_offset

                        if item["employee"] is not None:

                            if not employee_is_free(
                                item["employee"],
                                data.get("date"),
                                leg_start_min,
                                duration_min,
                            ):
                                conflict = item["employee"]
                                break

                        else:

                            candidates = auto_assign_candidates_by_service.get(
                                item["service"].service_id, []
                            )

                            chosen = next(
                                (
                                    candidate
                                    for candidate in candidates
                                    if employee_is_free(
                                        candidate,
                                        data.get("date"),
                                        leg_start_min,
                                        duration_min,
                                    )
                                ),
                                None,
                            )

                            if chosen is None:
                                no_staff_for = item["service"]
                                break

                            item["employee"] = chosen

                        running_offset += duration_min

                    if conflict:

                        return Response(
                            {
                                "message": (
                                    f"{conflict.employee_name} "
                                    f"is not available at "
                                    f"{data.get('time')} on "
                                    f"{data.get('date')}. Please choose "
                                    "a different time or employee."
                                )
                            },
                            status=status.HTTP_409_CONFLICT,
                        )

                    if no_staff_for:

                        return Response(
                            {
                                "message": (
                                    f"No staff is available for "
                                    f"{no_staff_for.service_name} at "
                                    f"{data.get('time')} on "
                                    f"{data.get('date')}. Please choose "
                                    "a different time."
                                )
                            },
                            status=status.HTTP_409_CONFLICT,
                        )

                    appointment = Appointment.objects.create(
                        appointment_number=generate_appointment_number(),
                        token_number=generate_token_number(org_id, data.get("date")),
                        org_id=org_id,
                        customer=customer,
                        date=data.get("date"),
                        time=data.get("time"),
                        status="Confirmed",
                        total_fee=total_fee,
                        total_duration_min=total_duration,
                        remarks=data.get("remarks", ""),
                        is_active=True,
                        created_by="SYSTEM",
                        updated_by="SYSTEM",
                    )

                    service_rows = []

                    for item in appointment_services:

                        row = AppointmentService.objects.create(
                            appointment=appointment,
                            service=item["service"],
                            service_name=item["service"].service_name,
                            employee=item["employee"],
                            duration_min=item["service"].duration,
                            fee=item["service"].fee,
                            status="Confirmed",
                            created_by="SYSTEM",
                            updated_by="SYSTEM",
                        )

                        service_rows.append(row)

                break

            except IntegrityError:
                appointment = None
                continue

        if appointment is None:
            return Response(
                {
                    "message": (
                        "Could not book this appointment due to a "
                        "conflicting token number. Please try again."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:

            email_status = send_appointment_confirmation_email(
                customer, appointment, service_rows
            )

        except Exception as e:

            email_status = f"Failed: {e}"

        try:

            notify_customer(
                customer=customer,
                title="Appointment Confirmed",
                message=(
                    f"Your appointment {appointment.appointment_number} "
                    f"is confirmed for {appointment.date} at {appointment.time}. "
                    f"Token: {appointment.token_number}."
                ),
                notification_type="Appointment Confirmation",
                appointment=appointment,
                actor=request.user,
            )

        except Exception:
            pass

        assigned_employees = {row.employee for row in service_rows if row.employee_id}

        for emp in assigned_employees:

            try:

                notify_employee(
                    employee=emp,
                    title="New Appointment Assigned",
                    message=(
                        f"You've been assigned to appointment "
                        f"{appointment.appointment_number} on "
                        f"{appointment.date} at {appointment.time}. "
                        f"Token: {appointment.token_number}."
                    ),
                    notification_type="Appointment Confirmation",
                    appointment=appointment,
                    actor=request.user,
                )

            except Exception:
                logger.exception("Appointment notification/email side effect failed")

        if request.user.is_authenticated:
            log_action(
                request.user,
                "Create",
                "Appointments",
                target_info=appointment.appointment_number,
            )

        return Response(
            {
                "message": "Appointment booked successfully.",
                "appointment_id": appointment.appointment_id,
                "appointment_number": appointment.appointment_number,
                "token_number": appointment.token_number,
                "email_status": email_status,
                "data": AppointmentSerializer(appointment).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):

        protected_fields = [
            "appointment_id",
            "appointment_number",
            "token_number",
            "org_id",
            "customer",
            "total_fee",
            "total_duration_min",
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
                {
                    "message": "These fields cannot be updated.",
                    "fields": invalid_fields,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment = self.get_object()

        old_status = appointment.status

        serializer = self.get_serializer(
            appointment, data=request.data, partial=kwargs.pop("partial", False)
        )

        serializer.is_valid(raise_exception=True)

        serializer.save(updated_by=getattr(request.user, "username", "SYSTEM"))

        appointment.refresh_from_db()

        if "status" in request.data and old_status != appointment.status:

            # Closing an appointment has to close its still-open
            # service legs too. Without this a leg left at
            # "Confirmed" under a "Completed" appointment is
            # unreachable - the employee queue hides appointments
            # that are already closed, so nobody can ever finish it,
            # and it keeps counting as outstanding work in reports.
            if appointment.status in CLOSING_STATUSES:

                open_rows = appointment.services.filter(
                    status__in=OPEN_SERVICE_STATUSES
                )

                actor = getattr(request.user, "username", "SYSTEM")

                if appointment.status == "Completed":
                    open_rows.update(
                        status="Completed",
                        completed_at=timezone.now(),
                        updated_by=actor,
                    )

                    try:
                        request_feedback_for_appointment(appointment)
                    except Exception:
                        logger.exception(
                            "Failed to request feedback for appointment %s "
                            "after admin closed it",
                            appointment.appointment_number,
                        )

                else:
                    open_rows.update(status=appointment.status, updated_by=actor)

            try:

                send_appointment_status_update_email(
                    appointment.customer, appointment, old_status, appointment.status
                )

            except Exception:
                logger.exception("Appointment notification/email side effect failed")

            try:

                notify_customer(
                    customer=appointment.customer,
                    title="Appointment Status Updated",
                    message=(
                        f"Your appointment {appointment.appointment_number} "
                        f"status changed from {old_status} to {appointment.status}."
                    ),
                    notification_type="Appointment Status Update",
                    appointment=appointment,
                    actor=request.user,
                )

            except Exception:
                logger.exception("Appointment notification/email side effect failed")

            assigned_employees = {
                svc.employee for svc in appointment.services.all() if svc.employee_id
            }

            for emp in assigned_employees:

                try:

                    notify_employee(
                        employee=emp,
                        title="Appointment Status Updated",
                        message=(
                            f"Appointment {appointment.appointment_number} "
                            f"status changed from {old_status} to {appointment.status}."
                        ),
                        notification_type="Appointment Status Update",
                        appointment=appointment,
                        actor=request.user,
                    )

                except Exception:
                    logger.exception(
                        "Appointment notification/email side effect failed"
                    )

            log_action(
                request.user,
                "Status Change",
                "Appointments",
                target_info=(
                    f"{appointment.appointment_number} "
                    f"({old_status} -> {appointment.status})"
                ),
            )

        else:

            log_action(
                request.user,
                "Update",
                "Appointments",
                target_info=appointment.appointment_number,
            )

        return Response(
            {
                "message": "Appointment updated successfully.",
                "data": AppointmentSerializer(appointment).data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):

        appointment = self.get_object()

        old_status = appointment.status

        appointment.status = "Cancelled"
        appointment.updated_by = getattr(request.user, "username", "SYSTEM")
        appointment.is_active = False
        appointment.save()
        appointment.services.filter(
            status__in=["Pending", "Confirmed", "Waiting", "In Progress"]
        ).update(
            status="Cancelled",
            updated_by=getattr(request.user, "username", "SYSTEM"),
        )

        if old_status != "Cancelled":

            try:

                send_appointment_status_update_email(
                    appointment.customer, appointment, old_status, appointment.status
                )

            except Exception:
                logger.exception("Appointment notification/email side effect failed")

            try:

                notify_customer(
                    customer=appointment.customer,
                    title="Appointment Cancelled",
                    message=(
                        f"Your appointment {appointment.appointment_number} "
                        f"has been cancelled."
                    ),
                    notification_type="Appointment Status Update",
                    appointment=appointment,
                    actor=request.user,
                )

            except Exception:
                logger.exception("Appointment notification/email side effect failed")

            assigned_employees = {
                svc.employee for svc in appointment.services.all() if svc.employee_id
            }

            for emp in assigned_employees:

                try:

                    notify_employee(
                        employee=emp,
                        title="Appointment Cancelled",
                        message=(
                            f"Appointment {appointment.appointment_number} "
                            f"assigned to you has been cancelled."
                        ),
                        notification_type="Appointment Status Update",
                        appointment=appointment,
                        actor=request.user,
                    )

                except Exception:
                    logger.exception(
                        "Appointment notification/email side effect failed"
                    )

        log_action(
            request.user,
            "Delete",
            "Appointments",
            target_info=appointment.appointment_number,
        )

        return Response(
            {"message": "Appointment cancelled successfully."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):

        appointments = self.get_queryset()

        today = timezone.now().date()

        aggregates = appointments.aggregate(
            totalAppointments=Count("appointment_id"),
            totalRevenue=Sum("total_fee"),
            todayAppointments=Count("appointment_id", filter=Q(date=today)),
            todayRevenue=Sum("total_fee", filter=Q(date=today)),
            upcomingAppointments=Count("appointment_id", filter=Q(date__gt=today)),
            **{
                f"{value.lower().replace(' ', '_')}Appointments": Count(
                    "appointment_id", filter=Q(status=value)
                )
                for value, _ in Appointment.STATUS_CHOICES
            },
        )

        aggregates["totalRevenue"] = aggregates["totalRevenue"] or Decimal("0.00")
        aggregates["todayRevenue"] = aggregates["todayRevenue"] or Decimal("0.00")

        status_breakdown = [
            {
                "status": value,
                "label": label,
                "count": aggregates.pop(
                    f"{value.lower().replace(' ', '_')}Appointments"
                ),
            }
            for value, label in Appointment.STATUS_CHOICES
        ]

        aggregates["statusBreakdown"] = status_breakdown

        return Response(aggregates)

    def _build_export_rows(self, request):

        appointments = self.get_queryset()

        return [
            {
                "Appointment Number": appointment.appointment_number,
                "Token Number": appointment.token_number,
                "Customer": appointment.customer.CustomerName,
                "Mobile": appointment.customer.Mobile,
                "Date": appointment.date,
                "Time": appointment.time,
                "Status": appointment.status,
                "Total Fee": appointment.total_fee,
                "Total Duration": appointment.total_duration_min,
            }
            for appointment in appointments
        ]

    @staticmethod
    def _export_base_name(request):
        """
        "appointments", or "appointments_2026-01-01_to_2026-01-31" when
        the caller passed a from_date/to_date range - so the date range
        being exported is visible in the filename before it's even
        opened, in addition to the exported-on date export_filename()
        appends.
        """

        from_date = request.query_params.get("from_date")
        to_date = request.query_params.get("to_date")

        if from_date and to_date:
            return f"appointments_{from_date}_to_{to_date}"
        if from_date:
            return f"appointments_from_{from_date}"
        if to_date:
            return f"appointments_upto_{to_date}"

        return "appointments"

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):

        data = self._build_export_rows(request)

        df = pd.DataFrame(data)

        response = HttpResponse(content_type="text/csv")

        filename = export_filename(self._export_base_name(request), "csv")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        df.to_csv(response, index=False)

        log_action(request.user, "Export", "Appointments")
        return response

    @action(detail=False, methods=["get"], url_path="export-excel")
    def export_excel(self, request):

        data = self._build_export_rows(request)

        df = pd.DataFrame(data)

        buffer = BytesIO()

        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:

            df.to_excel(writer, index=False, sheet_name="Appointments")

            worksheet = writer.sheets["Appointments"]

            for column_cells in worksheet.columns:

                max_length = max(
                    len(str(cell.value)) if cell.value is not None else 0
                    for cell in column_cells
                )

                worksheet.column_dimensions[column_cells[0].column_letter].width = (
                    max_length + 4
                )

        buffer.seek(0)

        response = HttpResponse(
            buffer.read(),
            content_type=(
                "application/vnd.openxmlformats-officedocument" ".spreadsheetml.sheet"
            ),
        )

        filename = export_filename(self._export_base_name(request), "xlsx")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        log_action(request.user, "Export", "Appointments")
        return response

    @action(detail=False, methods=["get"], url_path="export-pdf")
    def export_pdf(self, request):

        appointments = self.get_queryset()
        data = self._build_export_rows(request)

        caller_org_id = getattr(request.user, "organization_id", None)
        org_id = caller_org_id or request.query_params.get("org_id")
        organization = organization_context(org_id)

        from_date = request.query_params.get("from_date")
        to_date = request.query_params.get("to_date")

        today = timezone.now().date()
        total_appointments = appointments.count()
        today_appointments = appointments.filter(date=today).count()
        upcoming_appointments = appointments.filter(date__gt=today).count()
        total_revenue = appointments.aggregate(total=Sum("total_fee"))[
            "total"
        ] or Decimal("0.00")

        kpi_cards = [
            {
                "label": "Total Appointments",
                "value": total_appointments,
                "sublabel": "All time",
            },
            {
                "label": "Today",
                "value": today_appointments,
                "sublabel": today.strftime("%d %b %Y"),
            },
            {
                "label": "Upcoming",
                "value": upcoming_appointments,
                "sublabel": "Scheduled ahead",
            },
            {
                "label": "Total Revenue",
                "value": f"{total_revenue:,.0f}",
                "sublabel": "All time",
            },
        ]

        report_subtitle = "Booking Activity & Revenue Insights"

        if from_date and to_date:
            report_subtitle += f" ({from_date} to {to_date})"
        elif from_date:
            report_subtitle += f" (from {from_date})"
        elif to_date:
            report_subtitle += f" (up to {to_date})"

        rows = [
            [
                row["Appointment Number"],
                row["Token Number"],
                row["Customer"],
                row["Mobile"],
                row["Date"],
                row["Time"],
                row["Status"],
                row["Total Fee"],
                row["Total Duration"],
            ]
            for row in data
        ]

        sections = [
            {
                "title": "Appointment Log",
                "headers": [
                    "Appointment No",
                    "Token No",
                    "Customer",
                    "Mobile",
                    "Date",
                    "Time",
                    "Status",
                    "Total Fee",
                    "Duration (Min)",
                ],
                "rows": rows,
                "status_cols": {6},
            }
        ]

        buffer = BytesIO()
        generate_module_report_pdf(
            buffer,
            "APPOINTMENTS REPORT",
            report_subtitle,
            organization,
            sections,
            kpi_title="Summary",
            kpi_cards=kpi_cards,
        )
        buffer.seek(0)

        response = HttpResponse(buffer.read(), content_type="application/pdf")

        filename = export_filename(self._export_base_name(request), "pdf")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        log_action(request.user, "Export", "Appointments")
        return response

    @action(detail=False, methods=["get"], url_path="status-choices")
    def status_choices(self, request):

        return Response(
            [
                {
                    "value": value,
                    "label": label,
                }
                for value, label in Appointment.STATUS_CHOICES
            ]
        )


class AppointmentServiceViewSet(viewsets.ReadOnlyModelViewSet):

    queryset = (
        AppointmentService.objects.select_related("appointment", "service", "employee")
        .all()
        .order_by("-appointment_service_id")
    )

    serializer_class = AppointmentServiceSerializer

    lookup_field = "appointment_service_id"

    def get_queryset(self):
        """
        Never let one organization read or act on another's service
        legs. Super Admins (no organization of their own) may narrow
        with ?org_id=.
        """

        queryset = super().get_queryset()

        caller_org_id = getattr(self.request.user, "organization_id", None)

        if caller_org_id is not None:
            return queryset.filter(appointment__org_id=caller_org_id)

        org_filter = self.request.query_params.get("org_id")

        if org_filter:
            queryset = queryset.filter(appointment__org_id=org_filter)

        appointment_filter = self.request.query_params.get("appointment_id")

        if appointment_filter:
            queryset = queryset.filter(appointment_id=appointment_filter)

        return queryset

    def _close_leg(self, request, new_status):
        """
        Move a single service leg to a final state and let the parent
        appointment re-derive its own status from whatever is left.
        Deliberately independent of the other legs: finishing one
        service is never gated on the rest of the appointment.
        """

        service_row = self.get_object()

        if service_row.status in TERMINAL_SERVICE_STATUSES:
            return Response(
                {
                    "success": False,
                    "message": (
                        f"This service is already marked "
                        f"'{service_row.status}'."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        actor = getattr(request.user, "username", "SYSTEM")

        service_row.status = new_status
        service_row.updated_by = actor

        update_fields = ["status", "updated_by", "updated_on"]

        if new_status == "Completed":

            completed_at = timezone.now()
            service_row.completed_at = completed_at
            update_fields.append("completed_at")

            if service_row.started_at:
                elapsed = (completed_at - service_row.started_at).total_seconds()
                service_row.actual_duration_min = max(1, round(elapsed / 60))
                update_fields.append("actual_duration_min")

        service_row.save(update_fields=update_fields)

        if new_status == "Completed":
            try:
                request_feedback_for_service(service_row)
            except Exception:
                logger.exception(
                    "Failed to request feedback for appointment %s service %s",
                    service_row.appointment.appointment_number,
                    service_row.appointment_service_id,
                )

        appointment = service_row.appointment

        appointment_status = sync_appointment_status(appointment, actor=actor)

        log_action(
            request.user,
            "Status Change",
            "Appointments",
            target_info=(
                f"{appointment.appointment_number} / "
                f"{service_row.service_name} -> {new_status}"
            ),
        )

        remaining = (
            appointment.services.filter(status__in=OPEN_SERVICE_STATUSES)
            .values_list("service_name", flat=True)
        )

        return Response(
            {
                "success": True,
                "message": f"Service marked '{new_status}'.",
                "data": {
                    "appointment_service_id": service_row.appointment_service_id,
                    "appointment_id": appointment.appointment_id,
                    "service_name": service_row.service_name,
                    "service_status": service_row.status,
                    "appointment_status": appointment_status,
                    "remaining_services": list(remaining),
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, appointment_service_id=None):
        return self._close_leg(request, "Completed")

    @action(detail=True, methods=["post"], url_path="skip")
    def skip(self, request, appointment_service_id=None):
        return self._close_leg(request, "Left Queue")