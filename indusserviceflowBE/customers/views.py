from io import BytesIO

import pandas as pd

from django.core.paginator import Paginator
from django.db.models import Count, OuterRef, Q, Subquery, Sum
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .pdf_report import generate_module_report_pdf, organization_context
from common.utils import export_filename

from appointments.models import Appointment
from appointments.serializers import AppointmentSerializer
from audit_logs.utils import log_action

from .models import Customer
from .serializers import CustomerSerializer

STATUS_BUCKET_MAP = {
    "Waiting": ["Confirmed", "Waiting"],
    "In service": ["In Progress"],
    "Served": ["Completed"],
}


class CustomerViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):

    queryset = Customer.objects.all().order_by("-CustomerId")

    serializer_class = CustomerSerializer

    def get_permissions(self):
        return [AllowAny()]

    def get_queryset(self):

        queryset = super().get_queryset()

        organization_id = self.request.query_params.get("OrganizationId")

        search = self.request.query_params.get("search")

        status_filter = self.request.query_params.get("status")

        caller_org_id = getattr(self.request.user, "organization_id", None)

        if caller_org_id is not None:

            queryset = queryset.filter(organization_id=caller_org_id)
        elif organization_id:
            queryset = queryset.filter(organization_id=organization_id)

        if search:

            queryset = queryset.filter(
                Q(CustomerName__icontains=search)
                | Q(Mobile__icontains=search)
                | Q(Email__icontains=search)
            )

        if status_filter and status_filter in STATUS_BUCKET_MAP:

            from appointments.models import Appointment as AppointmentModel

            latest_appointment_status = Subquery(
                AppointmentModel.objects.filter(customer_id=OuterRef("pk"))
                .order_by("-date", "-time", "-appointment_id")
                .values("status")[:1]
            )

            queryset = queryset.annotate(
                latest_appointment_status=latest_appointment_status
            ).filter(latest_appointment_status__in=STATUS_BUCKET_MAP[status_filter])

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Paginated, envelope-style response — same { success, message,
        pagination, data } shape the Employees endpoint already uses,
        so the frontend can drive the Customers table off real backend
        pages instead of fetching everything and slicing client-side.

        Defaults to 10 per page. `page_size` is still overridable (and
        capped) for any other caller that needs a different page size.
        """

        queryset = self.filter_queryset(self.get_queryset())

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (TypeError, ValueError):
            page = 1

        try:
            page_size = int(request.query_params.get("page_size", 10))
        except (TypeError, ValueError):
            page_size = 10

        page_size = max(1, min(page_size, 100))

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        serializer = self.get_serializer(page_obj.object_list, many=True)

        return Response(
            {
                "success": True,
                "message": (
                    "Customers retrieved successfully."
                    if paginator.count
                    else "No customers found."
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

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        """
        A customer's whole history within the organization they belong
        to: every appointment they've ever booked there (each with its
        services/employee/fee breakdown), plus summary stats.

        self.get_object() reuses get_queryset(), so this is already
        scoped the same way the list endpoint is - an Org Admin /
        Employee can only pull history for a customer in their own
        organization; a Super Admin can pull any customer's (scoped
        via ?OrganizationId= like everywhere else on this viewset).
        """

        customer = self.get_object()

        appointments = (
            Appointment.objects.filter(
                customer=customer, org_id=customer.organization_id
            )
            .select_related("customer")
            .prefetch_related("services", "services__service", "services__employee")
            .order_by("-date", "-time")
        )

        aggregates = appointments.aggregate(
            total_appointments=Count("appointment_id"),
            completed=Count("appointment_id", filter=Q(status="Completed")),
            cancelled=Count("appointment_id", filter=Q(status="Cancelled")),
            no_show=Count("appointment_id", filter=Q(status="No Show")),
            total_spent=Sum("total_fee", filter=Q(status="Completed")),
        )

        first_appointment = appointments.order_by("date", "time").first()

        last_appointment = appointments.first()

        return Response(
            {
                "customer": CustomerSerializer(customer).data,
                "stats": {
                    "totalAppointments": (aggregates["total_appointments"] or 0),
                    "completed": aggregates["completed"] or 0,
                    "cancelled": aggregates["cancelled"] or 0,
                    "noShow": aggregates["no_show"] or 0,
                    "totalSpent": aggregates["total_spent"] or 0,
                    "firstVisit": (
                        first_appointment.date if first_appointment else None
                    ),
                    "lastVisit": (last_appointment.date if last_appointment else None),
                },
                "appointments": AppointmentSerializer(appointments, many=True).data,
            }
        )

    def _build_history_export_rows(self, customer):
        """
        Flattens one customer's appointment history into export rows -
        one row per appointment (not per service line), matching what
        the "View History" modal shows: date/time, services rendered
        (joined into one cell), employee(s), fee and status.

        Reuses the same queryset/ordering as history() above so a
        downloaded file always matches what the modal displayed.
        """

        appointments = (
            Appointment.objects.filter(
                customer=customer, org_id=customer.organization_id
            )
            .select_related("customer")
            .prefetch_related("services", "services__service", "services__employee")
            .order_by("-date", "-time")
        )

        rows = []

        for appointment in appointments:

            services = list(appointment.services.all())

            service_names = (
                ", ".join(svc.service.service_name for svc in services if svc.service)
                or "-"
            )

            employee_names = (
                ", ".join(
                    sorted(
                        set(
                            svc.employee.employee_name
                            for svc in services
                            if svc.employee
                        )
                    )
                )
                or "Unassigned"
            )

            rows.append(
                {
                    "Appointment Number": appointment.appointment_number,
                    "Date": appointment.date,
                    "Time": appointment.time,
                    "Services": service_names,
                    "Employee": employee_names,
                    "Status": appointment.status,
                    "Total Fee": appointment.total_fee,
                }
            )

        return rows

    @action(detail=True, methods=["get"], url_path="history/export-csv")
    def export_history_csv(self, request, pk=None):

        customer = self.get_object()

        data = self._build_history_export_rows(customer)

        log_action(request.user, "Export", "Customer History", customer.CustomerName)

        df = pd.DataFrame(data)

        response = HttpResponse(content_type="text/csv")

        safe_name = (
            "".join(
                ch
                for ch in customer.CustomerName
                if ch.isalnum() or ch in (" ", "_", "-")
            )
            .strip()
            .replace(" ", "_")
            or "customer"
        )

        filename = export_filename(f"{safe_name}_history", "csv")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        df.to_csv(response, index=False)

        return response

    @action(detail=True, methods=["get"], url_path="history/export-excel")
    def export_history_excel(self, request, pk=None):

        customer = self.get_object()

        try:

            data = self._build_history_export_rows(customer)

            log_action(
                request.user, "Export", "Customer History", customer.CustomerName
            )

            df = pd.DataFrame(data)

            buffer = BytesIO()

            with pd.ExcelWriter(buffer, engine="openpyxl") as writer:

                df.to_excel(writer, index=False, sheet_name="History")

                worksheet = writer.sheets["History"]

                for column_cells in worksheet.columns:

                    max_length = max(
                        len(str(cell.value)) if cell.value is not None else 0
                        for cell in column_cells
                    )

                    worksheet.column_dimensions[column_cells[0].column_letter].width = (
                        max_length + 4
                    )

            buffer.seek(0)

            safe_name = (
                "".join(
                    ch
                    for ch in customer.CustomerName
                    if ch.isalnum() or ch in (" ", "_", "-")
                )
                .strip()
                .replace(" ", "_")
                or "customer"
            )

            filename = export_filename(f"{safe_name}_history", "xlsx")

            response = HttpResponse(
                buffer.read(),
                content_type=(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ),
            )

            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            return response

        except Exception as e:

            return Response(
                {"message": "Failed to export Excel file.", "error": str(e)}, status=500
            )

    @action(detail=True, methods=["get"], url_path="history/export-pdf")
    def export_history_pdf(self, request, pk=None):
        """
        Same branded report look as the Customers directory PDF
        (export_pdf below) - navy/teal header banner, KPI summary
        cards, numbered section + data table, Orchasp footer - just
        scoped to this one customer's appointment history instead of
        the whole customer list.
        """

        customer = self.get_object()

        try:

            data = self._build_history_export_rows(customer)

            log_action(
                request.user, "Export", "Customer History", customer.CustomerName
            )

            organization = organization_context(customer.organization_id)

            total_appointments = len(data)
            completed = sum(1 for row in data if row["Status"] == "Completed")
            cancelled = sum(1 for row in data if row["Status"] == "Cancelled")
            no_show = sum(1 for row in data if row["Status"] == "No Show")
            total_spent = sum(
                row["Total Fee"] or 0 for row in data if row["Status"] == "Completed"
            )

            kpi_cards = [
                {
                    "label": "Total Appointments",
                    "value": total_appointments,
                    "sublabel": "All time",
                },
                {
                    "label": "Completed",
                    "value": completed,
                    "sublabel": "Successfully served",
                },
                {
                    "label": "Cancelled / No Show",
                    "value": cancelled + no_show,
                    "sublabel": "Did not complete",
                },
                {
                    "label": "Total Spent",
                    "value": f"{total_spent:,.0f}",
                    "sublabel": "On completed visits",
                },
            ]

            rows = [
                [
                    row["Appointment Number"],
                    row["Date"],
                    row["Time"],
                    row["Services"],
                    row["Employee"],
                    row["Status"],
                    row["Total Fee"],
                ]
                for row in data
            ]

            sections = [
                {
                    "title": f"Appointment History — {customer.CustomerName}",
                    "headers": [
                        "Appointment No",
                        "Date",
                        "Time",
                        "Services",
                        "Employee",
                        "Status",
                        "Total Fee",
                    ],
                    "rows": rows,
                    "status_cols": {5},
                }
            ]

            buffer = BytesIO()
            generate_module_report_pdf(
                buffer,
                "CUSTOMER HISTORY REPORT",
                f"{customer.Mobile}"
                + (f" · {customer.Email}" if customer.Email else ""),
                organization,
                sections,
                kpi_title="Summary",
                kpi_cards=kpi_cards,
            )
            buffer.seek(0)

            safe_name = (
                "".join(
                    ch
                    for ch in customer.CustomerName
                    if ch.isalnum() or ch in (" ", "_", "-")
                )
                .strip()
                .replace(" ", "_")
                or "customer"
            )

            filename = export_filename(f"{safe_name}_history", "pdf")

            response = HttpResponse(buffer.read(), content_type="application/pdf")

            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            return response

        except Exception as e:

            return Response(
                {"message": "Failed to export PDF file.", "error": str(e)}, status=500
            )

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """
        Dashboard tiles for the Customers page. Computed as real
        aggregate queries (not by pulling every customer + every
        appointment to the client and joining there), so this stays
        cheap regardless of how many customers/appointments the org
        has, and works alongside the paginated list endpoint above.

        Respects `search` (so the tiles match what's on screen while
        searching) but intentionally ignores `status`, since that
        filter only narrows the *table*, not these summary counts.
        """

        customers = self.get_queryset()

        today = timezone.now().date()

        total_customers = customers.count()

        new_customers_this_month = customers.filter(
            CreatedOn__month=today.month, CreatedOn__year=today.year
        ).count()

        customers_added_today = customers.filter(CreatedOn__date=today).count()

        customers_this_month = customers.filter(
            CreatedOn__month=today.month, CreatedOn__year=today.year
        ).count()

        from appointments.models import Appointment as AppointmentModel

        latest_appointment_status = Subquery(
            AppointmentModel.objects.filter(customer_id=OuterRef("pk"))
            .order_by("-appointment_id")
            .values("status")[:1]
        )

        bucketed = customers.annotate(
            latest_appointment_status=latest_appointment_status
        )

        waiting = bucketed.filter(
            latest_appointment_status__in=STATUS_BUCKET_MAP["Waiting"]
        ).count()

        in_service = bucketed.filter(
            latest_appointment_status__in=STATUS_BUCKET_MAP["In service"]
        ).count()

        served = bucketed.filter(
            latest_appointment_status__in=STATUS_BUCKET_MAP["Served"]
        ).count()

        return Response(
            {
                "totalCustomers": total_customers,
                "newCustomersThisMonth": new_customers_this_month,
                "customersAddedToday": customers_added_today,
                "customersThisMonth": customers_this_month,
                "waiting": waiting,
                "inService": in_service,
                "served": served,
            }
        )

    def _build_export_rows(self):

        customers = self.get_queryset()

        return [
            {
                "Customer Name": customer.CustomerName,
                "Mobile": customer.Mobile,
                "Email": customer.Email,
                "Gender": customer.Gender,
            }
            for customer in customers
        ]

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):

        data = self._build_export_rows()
        log_action(request.user, "Export", "Customers")

        df = pd.DataFrame(data)

        response = HttpResponse(content_type="text/csv")

        filename = export_filename("customers", "csv")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        df.to_csv(response, index=False)

        return response

    @action(detail=False, methods=["get"], url_path="export-excel")
    def export_excel(self, request):

        try:

            data = self._build_export_rows()
            log_action(request.user, "Export", "Customers")

            df = pd.DataFrame(data)

            buffer = BytesIO()

            with pd.ExcelWriter(buffer, engine="openpyxl") as writer:

                df.to_excel(writer, index=False, sheet_name="Customers")

                worksheet = writer.sheets["Customers"]

                for column_cells in worksheet.columns:

                    max_length = max(
                        len(str(cell.value)) if cell.value is not None else 0
                        for cell in column_cells
                    )

                    worksheet.column_dimensions[column_cells[0].column_letter].width = (
                        max_length + 4
                    )

            buffer.seek(0)

            filename = export_filename("customers", "xlsx")

            response = HttpResponse(
                buffer.read(),
                content_type=(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ),
            )

            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            return response

        except Exception as e:

            return Response(
                {"message": "Failed to export Excel file.", "error": str(e)}, status=500
            )

    @action(detail=False, methods=["get"], url_path="export-pdf")
    def export_pdf(self, request):

        try:

            customers = self.get_queryset()
            log_action(request.user, "Export", "Customers")

            caller_org_id = getattr(request.user, "organization_id", None)
            org_id = caller_org_id or request.query_params.get("OrganizationId")
            organization = organization_context(org_id)

            total_customers = customers.count()

            today = timezone.now().date()
            month_start = today.replace(day=1)
            new_this_month = customers.filter(CreatedOn__date__gte=month_start).count()

            gender_counts = {
                row["Gender"]: row["count"]
                for row in customers.values("Gender").annotate(
                    count=Count("CustomerId")
                )
            }

            kpi_cards = [
                {
                    "label": "Total Customers",
                    "value": total_customers,
                    "sublabel": "In this organization",
                },
                {
                    "label": "New This Month",
                    "value": new_this_month,
                    "sublabel": month_start.strftime("Since %d %b %Y"),
                },
                {
                    "label": "Male",
                    "value": gender_counts.get("Male", 0),
                    "sublabel": "Registered customers",
                },
                {
                    "label": "Female",
                    "value": gender_counts.get("Female", 0),
                    "sublabel": "Registered customers",
                },
            ]

            rows = [
                [
                    customer.CustomerName,
                    customer.Mobile,
                    customer.Email,
                    customer.Gender,
                ]
                for customer in customers
            ]

            sections = [
                {
                    "title": "Customer Directory",
                    "headers": ["Customer Name", "Mobile", "Email", "Gender"],
                    "rows": rows,
                }
            ]

            buffer = BytesIO()
            generate_module_report_pdf(
                buffer,
                "CUSTOMERS REPORT",
                "Customer Directory & Engagement Insights",
                organization,
                sections,
                kpi_title="Summary",
                kpi_cards=kpi_cards,
            )
            buffer.seek(0)

            filename = export_filename("customers", "pdf")

            response = HttpResponse(buffer.read(), content_type="application/pdf")

            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            return response

        except Exception as e:

            return Response(
                {"message": "Failed to export PDF file.", "error": str(e)}, status=500
            )
