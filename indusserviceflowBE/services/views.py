from io import BytesIO

import pandas as pd

from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.db.models.deletion import ProtectedError
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


from .pdf_report import generate_module_report_pdf, organization_context
from common.utils import export_filename

from .models import ServiceType, Service
from .serializers import (
    ServiceTypeSerializer,
    ServiceSerializer,
)

from audit_logs.utils import log_action


def _caller_organization_id(request):
    """
    Organization id of the authenticated caller (Org Admin user or
    Employee token). Both `users.User` (via the real `organization`
    FK) and `employees.authentication.EmployeeUser` expose this as
    `.organization_id`, so this works uniformly for either actor.

    Returns None for Super Admins, who are not tied to a single
    organization.
    """
    return getattr(request.user, "organization_id", None)


def _resolve_organization_id_for_create(request):
    """
    Organization a new ServiceType/Service should be attached to.

    - Org Admins / Employees: always their own organization. This is
      NEVER taken from client input, so a caller cannot create data
      under a different organization by passing a different id.
    - Super Admins: not linked to one organization, so they must say
      which org they are acting on behalf of via "organization_id" in
      the request body.
    """

    caller_org_id = _caller_organization_id(request)

    if caller_org_id is not None:
        return caller_org_id

    org_id = request.data.get("organization_id")

    if not org_id:
        raise ValidationError(
            {
                "organization_id": (
                    "This account is not linked to an organization. "
                    "Super Admins must supply organization_id explicitly."
                )
            }
        )

    return org_id


def _naive_local(dt):
    """Convert a timezone-aware datetime to a naive local datetime.
    Excel/openpyxl cannot store tz-aware datetimes, so this must run
    before any datetime field is handed to pandas for xlsx export."""

    if dt is None:
        return dt

    if timezone.is_aware(dt):
        return timezone.localtime(dt).replace(tzinfo=None)

    return dt


class ServiceTypeViewSet(viewsets.ModelViewSet):

    queryset = (
        ServiceType.objects.all()
        .annotate(services_count=Count("services"))
        .order_by("service_type_id")
    )

    serializer_class = ServiceTypeSerializer

    lookup_field = "service_type_id"

    def get_queryset(self):

        queryset = super().get_queryset()

        organization_id = self.request.query_params.get("organization_id")

        search = self.request.query_params.get("search")

        status_filter = self.request.query_params.get("status")

        caller_org_id = _caller_organization_id(self.request)

        if caller_org_id is not None:

            queryset = queryset.filter(organization_id=caller_org_id)
        elif organization_id:

            queryset = queryset.filter(organization_id=organization_id)
        else:

            queryset = queryset.filter(category__isnull=True)

        if status_filter:

            queryset = queryset.filter(status=status_filter)

        if search:

            queryset = queryset.filter(service_type_name__icontains=search)

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Paginated, envelope-style response — same { success, message,
        pagination, data } shape Customers/Employees already use, so
        the Service Categories table can be driven off real backend
        pages instead of fetching everything and slicing client-side.

        `page_size` defaults high enough that callers which don't
        care about paging (dropdowns, header search, per-category
        service counts, etc.) keep getting effectively the full
        filtered list, while the Service Categories management page
        can request real pages via `page` / `page_size`.
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
                    "Service categories retrieved successfully."
                    if paginator.count
                    else "No service categories found."
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

    def perform_create(self, serializer):

        organization_id = _resolve_organization_id_for_create(self.request)

        service_type_name = (serializer.validated_data.get("service_type_name") or "").strip()

        if ServiceType.objects.filter(
            organization_id=organization_id,
            service_type_name__iexact=service_type_name,
        ).exists():
            raise ValidationError(
                {
                    "service_type_name": (
                        "A service category with this name already exists "
                        "for your organization."
                    )
                }
            )

        username = (
            self.request.user.username
            if self.request.user.is_authenticated
            else "System"
        )

        serializer.save(
            organization_id=organization_id, created_by=username, updated_by=username
        )

    def perform_update(self, serializer):

        service_type_name = serializer.validated_data.get("service_type_name")

        if service_type_name:

            if ServiceType.objects.filter(
                organization_id=serializer.instance.organization_id,
                service_type_name__iexact=service_type_name.strip(),
            ).exclude(pk=serializer.instance.pk).exists():
                raise ValidationError(
                    {
                        "service_type_name": (
                            "A service category with this name already exists "
                            "for your organization."
                        )
                    }
                )

        username = (
            self.request.user.username
            if self.request.user.is_authenticated
            else "System"
        )

        serializer.save(updated_by=username)

    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        self.perform_create(serializer)

        log_action(
            request.user,
            "Create",
            "Services",
            target_info=serializer.data.get("service_type_name"),
        )

        return Response(
            {
                "message": "Service Category created successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):

        partial = kwargs.pop("partial", False)

        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        serializer.is_valid(raise_exception=True)

        self.perform_update(serializer)

        log_action(
            request.user,
            "Update",
            "Services",
            target_info=serializer.data.get("service_type_name"),
        )

        return Response(
            {
                "message": "Service Category updated successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **_kwargs):

        instance = self.get_object()

        service_type_name = instance.service_type_name

        try:

            instance.delete()

            log_action(
                request.user, "Delete", "Services", target_info=service_type_name
            )

            return Response(
                {"message": "Service Category deleted successfully."},
                status=status.HTTP_200_OK,
            )

        except ProtectedError:

            return Response(
                {
                    "message": "Cannot delete service category because services are assigned to it."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):

        queryset = self.get_queryset()

        return Response(
            {
                "totalServiceTypes": queryset.count(),
                "activeServiceTypes": queryset.filter(status="Active").count(),
                "inactiveServiceTypes": queryset.filter(status="Inactive").count(),
            }
        )

    def _build_export_rows(self):

        queryset = self.get_queryset()

        return [
            {
                "Organization": row.organization_id,
                "Name": row.service_type_name,
                "Description": row.description,
                "Status": row.status,
            }
            for row in queryset
        ]

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):

        data = self._build_export_rows()

        df = pd.DataFrame(data)

        response = HttpResponse(content_type="text/csv")

        filename = export_filename("service_types", "csv")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        df.to_csv(response, index=False)

        log_action(request.user, "Export", "Services")
        return response

    @action(detail=False, methods=["get"], url_path="export-excel")
    def export_excel(self, request):

        data = self._build_export_rows()

        df = pd.DataFrame(data)

        buffer = BytesIO()

        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:

            df.to_excel(writer, index=False, sheet_name="Service Types")

        buffer.seek(0)

        response = HttpResponse(
            buffer.read(),
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
        )

        filename = export_filename("service_types", "xlsx")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        log_action(request.user, "Export", "Services")
        return response

    @action(detail=False, methods=["get"], url_path="export-pdf")
    def export_pdf(self, request):

        rows_data = self._build_export_rows()

        caller_org_id = _caller_organization_id(request)
        org_id = caller_org_id or request.query_params.get("organization_id")
        organization = organization_context(org_id)

        total = len(rows_data)
        active = sum(1 for r in rows_data if r["Status"] == "Active")
        inactive = total - active

        kpi_cards = [
            {
                "label": "Total Service Types",
                "value": total,
                "sublabel": "In this organization",
            },
            {"label": "Active", "value": active, "sublabel": "Currently active"},
            {"label": "Inactive", "value": inactive, "sublabel": "Currently inactive"},
        ]

        rows = [[r["Name"], r["Description"], r["Status"]] for r in rows_data]

        sections = [
            {
                "title": "Service Type Directory",
                "headers": ["Name", "Description", "Status"],
                "rows": rows,
                "status_cols": {2},
            }
        ]

        buffer = BytesIO()
        generate_module_report_pdf(
            buffer,
            "SERVICE TYPES REPORT",
            "Service Category Overview",
            organization,
            sections,
            kpi_title="Summary",
            kpi_cards=kpi_cards,
        )
        buffer.seek(0)

        filename = export_filename("service_types", "pdf")

        response = HttpResponse(buffer.read(), content_type="application/pdf")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        log_action(request.user, "Export", "Services")
        return response


class ServiceViewSet(viewsets.ModelViewSet):

    queryset = (
        Service.objects.select_related("service_type").all().order_by("service_id")
    )

    serializer_class = ServiceSerializer

    lookup_field = "service_id"

    def get_permissions(self):

        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):

        queryset = super().get_queryset()

        organization_id = self.request.query_params.get("organization_id")

        search = self.request.query_params.get("search")

        status_filter = self.request.query_params.get("status")

        service_type = self.request.query_params.get("service_type")

        caller_org_id = _caller_organization_id(self.request)

        if caller_org_id is not None:

            queryset = queryset.filter(organization_id=caller_org_id)
        elif organization_id:

            queryset = queryset.filter(organization_id=organization_id)

        if status_filter:

            queryset = queryset.filter(status=status_filter)

        if service_type:

            queryset = queryset.filter(service_type_id=service_type)

        if search:

            queryset = queryset.filter(
                Q(service_name__icontains=search)
                | Q(service_type__service_type_name__icontains=search)
            )

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Paginated, envelope-style response — same { success, message,
        pagination, data } shape Customers/Employees already use, so
        the Services table can be driven off real backend pages
        instead of fetching everything and slicing client-side.

        `page_size` defaults high enough that callers which don't
        care about paging (dropdowns, the public booking page, header
        search, etc.) keep getting effectively the full filtered
        list, while the Services management page can request real
        pages via `page` / `page_size`.
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
                    "Services retrieved successfully."
                    if paginator.count
                    else "No services found."
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

    def perform_create(self, serializer):

        organization_id = _resolve_organization_id_for_create(self.request)

        service_type = serializer.validated_data.get("service_type")

        if (
            service_type is not None
            and service_type.organization_id is not None
            and str(service_type.organization_id) != str(organization_id)
        ):
            raise ValidationError(
                {
                    "service_type": (
                        "This service category belongs to a different " "organization."
                    )
                }
            )

        service_name = (serializer.validated_data.get("service_name") or "").strip()

        if Service.objects.filter(
            organization_id=organization_id,
            service_name__iexact=service_name,
        ).exists():
            raise ValidationError(
                {
                    "service_name": (
                        "A service with this name already exists for your "
                        "organization."
                    )
                }
            )

        username = (
            self.request.user.username
            if self.request.user.is_authenticated
            else "System"
        )

        serializer.save(
            organization_id=organization_id, created_by=username, updated_by=username
        )

    def perform_update(self, serializer):

        service_name = serializer.validated_data.get("service_name")

        if service_name:

            if Service.objects.filter(
                organization_id=serializer.instance.organization_id,
                service_name__iexact=service_name.strip(),
            ).exclude(pk=serializer.instance.pk).exists():
                raise ValidationError(
                    {
                        "service_name": (
                            "A service with this name already exists for "
                            "your organization."
                        )
                    }
                )

        username = (
            self.request.user.username
            if self.request.user.is_authenticated
            else "System"
        )

        serializer.save(updated_by=username)

    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        self.perform_create(serializer)

        log_action(
            request.user,
            "Create",
            "Services",
            target_info=serializer.data.get("service_name"),
        )

        return Response(
            {"message": "Service created successfully.", "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):

        partial = kwargs.pop("partial", False)

        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        serializer.is_valid(raise_exception=True)

        self.perform_update(serializer)

        log_action(
            request.user,
            "Update",
            "Services",
            target_info=serializer.data.get("service_name"),
        )

        return Response(
            {"message": "Service updated successfully.", "data": serializer.data},
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        service_name = instance.service_name

        try:

            instance.delete()

            log_action(request.user, "Delete", "Services", target_info=service_name)

            return Response(
                {"message": "Service deleted successfully."}, status=status.HTTP_200_OK
            )

        except ProtectedError:

            return Response(
                {
                    "message": "Cannot delete service because it has appointments assigned to it."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):

        queryset = self.get_queryset()

        return Response(
            {
                "totalServices": queryset.count(),
                "activeServices": queryset.filter(status="Active").count(),
                "inactiveServices": queryset.filter(status="Inactive").count(),
            }
        )

    def _build_export_rows(self):

        queryset = self.get_queryset()

        return [
            {
                "Organization": row.organization_id,
                "Service Name": row.service_name,
                "Service Type": row.service_type.service_type_name,
                "Duration (Min)": row.duration,
                "Fee": row.fee,
                "Status": row.status,
            }
            for row in queryset
        ]

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):

        data = self._build_export_rows()

        df = pd.DataFrame(data)

        response = HttpResponse(content_type="text/csv")

        filename = export_filename("services", "csv")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        df.to_csv(response, index=False)

        log_action(request.user, "Export", "Services")
        return response

    @action(detail=False, methods=["get"], url_path="export-excel")
    def export_excel(self, request):

        data = self._build_export_rows()

        df = pd.DataFrame(data)

        buffer = BytesIO()

        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:

            df.to_excel(writer, index=False, sheet_name="Services")

            worksheet = writer.sheets["Services"]

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
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
        )

        filename = export_filename("services", "xlsx")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        log_action(request.user, "Export", "Services")
        return response

    @action(detail=False, methods=["get"], url_path="export-pdf")
    def export_pdf(self, request):

        rows_data = self._build_export_rows()

        caller_org_id = _caller_organization_id(request)
        org_id = caller_org_id or request.query_params.get("organization_id")
        organization = organization_context(org_id)

        total = len(rows_data)
        active = sum(1 for r in rows_data if r["Status"] == "Active")
        inactive = total - active
        avg_fee = (sum(r["Fee"] for r in rows_data) / total) if total else 0
        avg_duration = (
            (sum(r["Duration (Min)"] for r in rows_data) / total) if total else 0
        )

        kpi_cards = [
            {
                "label": "Total Services",
                "value": total,
                "sublabel": "In this organization",
            },
            {"label": "Active", "value": active, "sublabel": "Currently active"},
            {"label": "Inactive", "value": inactive, "sublabel": "Currently inactive"},
            {
                "label": "Avg Fee",
                "value": f"{avg_fee:,.0f}",
                "sublabel": f"Avg duration {avg_duration:.0f} min",
            },
        ]

        rows = [
            [
                r["Service Name"],
                r["Service Type"],
                r["Duration (Min)"],
                r["Fee"],
                r["Status"],
            ]
            for r in rows_data
        ]

        sections = [
            {
                "title": "Service Directory",
                "headers": [
                    "Service Name",
                    "Service Type",
                    "Duration (Min)",
                    "Fee",
                    "Status",
                ],
                "rows": rows,
                "status_cols": {4},
            }
        ]

        buffer = BytesIO()
        generate_module_report_pdf(
            buffer,
            "SERVICES REPORT",
            "Service Catalog & Utilization Insights",
            organization,
            sections,
            kpi_title="Summary",
            kpi_cards=kpi_cards,
        )
        buffer.seek(0)

        filename = export_filename("services", "pdf")

        response = HttpResponse(buffer.read(), content_type="application/pdf")

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        log_action(request.user, "Export", "Services")
        return response
