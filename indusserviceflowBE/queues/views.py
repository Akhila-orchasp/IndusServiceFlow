from collections import Counter
from datetime import datetime
from io import BytesIO

from django.core.paginator import Paginator
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import viewsets
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

import pandas as pd

from .pdf_report import generate_module_report_pdf, organization_context
from common.utils import export_filename

from appointments.models import AppointmentService
from services.models import Service
from audit_logs.utils import log_action


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


def _scope_org_id(request):
    """
    Resolve the organization id every action in this viewset should
    filter by.

    - Org Admins / Employees: ALWAYS their own organization. Any
      ?org_id= passed in the query string is ignored, so a caller
      cannot view or export another organization's queue data by
      changing the query string.
    - Super Admins: no organization of their own, so they may
      explicitly scope to one organization via ?org_id=, or leave it
      unset to see the platform-wide queue.
    """

    caller_org_id = _caller_organization_id(request)

    if caller_org_id is not None:
        return caller_org_id

    return request.query_params.get("org_id")


def _parse_date_param(value):
    """
    Parses a ?date=YYYY-MM-DD query param. Falls back to today's date
    when missing or malformed, so exports are always scoped to a real
    date rather than silently returning every record ever created.
    """
    if value:
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            return timezone.now().date()
    return timezone.now().date()


class QueueManagementViewSet(viewsets.ViewSet):

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):

        today = timezone.now().date()

        org_id = _scope_org_id(request)

        services = AppointmentService.objects.filter(appointment__date=today)

        if org_id:
            services = services.filter(appointment__org_id=org_id)

        return Response(
            {
                "total_waiting": services.filter(
                    status__in=["Confirmed", "Waiting"]
                ).count(),
                "currently_serving": services.filter(status="In Progress").count(),
                "completed_today": services.filter(status="Completed").count(),
                "active_services": services.values("service_id").distinct().count(),
            }
        )

    @action(detail=False, methods=["get"], url_path="active-queues")
    def active_queues(self, request):

        today = timezone.now().date()

        org_id = _scope_org_id(request)

        services = AppointmentService.objects.select_related(
            "appointment", "appointment__customer", "employee"
        ).filter(appointment__date=today)

        if org_id:
            services = services.filter(appointment__org_id=org_id)

        result = []

        service_ids = services.values_list("service_id", flat=True).distinct()

        for service_id in service_ids:

            rows = services.filter(service_id=service_id)

            current = rows.filter(status="In Progress").first()

            waiting = rows.filter(status__in=["Confirmed", "Waiting"])

            result.append(
                {
                    "service_id": service_id,
                    "service_name": rows.first().service_name,
                    "waiting_count": waiting.count(),
                    "currently_serving": {
                        "employee_name": (
                            current.employee.employee_name
                            if current and current.employee
                            else None
                        ),
                        "customer_name": (
                            current.appointment.customer.CustomerName
                            if current
                            else None
                        ),
                        "token_number": (
                            current.appointment.token_number if current else None
                        ),
                    },
                }
            )

        return Response(result)

    @action(detail=False, methods=["get"], url_path="live-queue")
    def live_queue(self, request):
        """
        Paginated, envelope-style response — same { success, message,
        pagination, data } shape the Employees and Customers endpoints
        already use, so the frontend can drive the Live Queue table off
        real backend pages instead of fetching everything and slicing
        client-side.
        """

        today = timezone.now().date()

        org_id = _scope_org_id(request)
        search = request.query_params.get("search")
        status_filter = request.query_params.get("status")
        service_id = request.query_params.get("service_id")
        employee_id = request.query_params.get("employee_id")

        queryset = AppointmentService.objects.select_related(
            "appointment", "appointment__customer", "employee"
        ).filter(appointment__date=today)

        if org_id:
            queryset = queryset.filter(appointment__org_id=org_id)

        if search:
            queryset = queryset.filter(
                Q(appointment__token_number__icontains=search)
                | Q(appointment__appointment_number__icontains=search)
                | Q(appointment__customer__CustomerName__icontains=search)
            )

        if status_filter:

            queryset = queryset.filter(status=status_filter)

        if service_id:
            queryset = queryset.filter(service_id=service_id)

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        queryset = queryset.order_by(
            "appointment__time",
            "appointment__token_number",
            "appointment_service_id",
        )

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (TypeError, ValueError):
            page = 1

        try:
            page_size = int(request.query_params.get("page_size", 5))
        except (TypeError, ValueError):
            page_size = 5

        page_size = max(1, min(page_size, 100))

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        data = []

        for row in page_obj.object_list:

            data.append(
                {
                    "appointment_id": row.appointment.appointment_id,
                    "appointment_number": row.appointment.appointment_number,
                    "token_number": row.appointment.token_number,
                    "customer_name": row.appointment.customer.CustomerName,
                    "service_name": row.service_name,
                    "employee_name": (
                        row.employee.employee_name if row.employee else None
                    ),
                    "status": row.status,
                }
            )

        return Response(
            {
                "success": True,
                "message": (
                    "Live queue retrieved successfully."
                    if paginator.count
                    else "No appointments in the queue."
                ),
                "pagination": {
                    "current_page": page_obj.number,
                    "total_pages": paginator.num_pages,
                    "total_records": paginator.count,
                    "page_size": page_size,
                    "has_next": page_obj.has_next(),
                    "has_previous": page_obj.has_previous(),
                },
                "data": data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="services")
    def services(self, request):

        org_id = _scope_org_id(request)

        services = Service.objects.all()

        if org_id:
            services = services.filter(organization_id=org_id)

        return Response(
            [
                {"service_id": service.service_id, "service_name": service.service_name}
                for service in services
            ]
        )

    @action(detail=False, methods=["get"], url_path="statuses")
    def statuses(self, request):

        return Response(
            [
                "Confirmed",
                "Waiting",
                "In Progress",
                "Completed",
                "Cancelled",
                "No Show",
                "Left Queue",
            ]
        )

    def get_export_data(self, request):
        """
        Builds the export rows for a single day only. Without this, the
        queue export pulled every appointment ever recorded for the org
        (every past day mixed together) instead of just the day being
        exported. Defaults to today; pass ?date=YYYY-MM-DD to export a
        different day.
        """

        org_id = _scope_org_id(request)
        export_date = _parse_date_param(request.query_params.get("date"))

        queue = AppointmentService.objects.select_related(
            "appointment", "appointment__customer", "employee"
        ).filter(appointment__date=export_date)

        if org_id:
            queue = queue.filter(appointment__org_id=org_id)

        queue = queue.order_by(
            "appointment__time",
            "appointment__token_number",
        )

        data = []

        for row in queue:

            data.append(
                {
                    "Date": row.appointment.date.strftime("%d-%b-%Y"),
                    "Appointment Number": row.appointment.appointment_number,
                    "Token Number": row.appointment.token_number,
                    "Customer": row.appointment.customer.CustomerName,
                    "Service": row.service_name,
                    "Employee": row.employee.employee_name if row.employee else "",
                    # This row's own leg status, matching live_queue()
                    # above - keeps exports consistent with what the
                    # dashboard shows for the same row.
                    "Status": row.status,
                }
            )

        return data, export_date

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):

        data, export_date = self.get_export_data(request)
        log_action(
            request.user, "Export", "Queue", f"Queue - {export_date.isoformat()}"
        )
        df = pd.DataFrame(data)

        response = HttpResponse(content_type="text/csv")

        filename = export_filename(f"queue_{export_date.isoformat()}", "csv")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        df.to_csv(response, index=False)

        return response

    @action(detail=False, methods=["get"], url_path="export-excel")
    def export_excel(self, request):

        data, export_date = self.get_export_data(request)
        log_action(
            request.user, "Export", "Queue", f"Queue - {export_date.isoformat()}"
        )
        df = pd.DataFrame(data)

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

        filename = export_filename(f"queue_{export_date.isoformat()}", "xlsx")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        with pd.ExcelWriter(response, engine="openpyxl") as writer:

            df.to_excel(writer, sheet_name="Queue", index=False)

        return response

    @action(detail=False, methods=["get"], url_path="export-pdf")
    def export_pdf(self, request):

        export_data, export_date = self.get_export_data(request)
        log_action(
            request.user, "Export", "Queue", f"Queue - {export_date.isoformat()}"
        )

        org_id = _scope_org_id(request)
        organization = organization_context(org_id)

        status_counts = Counter(row["Status"] for row in export_data)
        total_in_queue = len(export_data)
        waiting = status_counts.get("Confirmed", 0) + status_counts.get("Waiting", 0)
        in_progress = status_counts.get("In Progress", 0)
        completed = status_counts.get("Completed", 0)

        kpi_cards = [
            {
                "label": "Total In Queue",
                "value": total_in_queue,
                "sublabel": export_date.strftime("%d %b %Y"),
            },
            {"label": "Waiting", "value": waiting, "sublabel": "Confirmed + Waiting"},
            {
                "label": "In Progress",
                "value": in_progress,
                "sublabel": "Currently being served",
            },
            {"label": "Completed", "value": completed, "sublabel": "Finished today"},
        ]

        rows = [
            [
                row["Date"],
                row["Appointment Number"],
                row["Token Number"],
                row["Customer"],
                row["Service"],
                row["Employee"],
                row["Status"],
            ]
            for row in export_data
        ]

        sections = [
            {
                "title": f"Queue - {export_date.strftime('%d %b %Y')}",
                "headers": [
                    "Date",
                    "Appointment No",
                    "Token No",
                    "Customer",
                    "Service",
                    "Employee",
                    "Status",
                ],
                "rows": rows,
                "status_cols": {6},
            }
        ]

        buffer = BytesIO()
        generate_module_report_pdf(
            buffer,
            "QUEUE REPORT",
            "Live Queue & Service Flow Insights",
            organization,
            sections,
            kpi_title="Summary",
            kpi_cards=kpi_cards,
        )
        buffer.seek(0)

        response = HttpResponse(buffer.read(), content_type="application/pdf")

        filename = export_filename(f"queue_{export_date.isoformat()}", "pdf")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        return response
