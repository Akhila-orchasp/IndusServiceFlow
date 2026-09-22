from rest_framework import serializers

from django.utils import timezone

from .models import (
    Employee,
    Shift,
    EmployeeService,
)
from .utils import calculate_employee_rating, get_shift_window_status


class EmployeeSerializer(serializers.ModelSerializer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if self.instance is not None:
            for field_name in ("employee_code", "username", "password"):
                if field_name in self.fields:
                    self.fields[field_name].required = False

    def _target_org_id(self):
        """
        Organization this employee belongs to (or is being created
        under). Taken from serializer context on create - `org` is
        read-only, so it never arrives in the payload - and from the
        existing row on update.
        """

        org_id = self.context.get("org_id")

        if org_id is not None:
            return org_id

        if self.instance is not None:
            return self.instance.org_id

        return None

    def validate_email(self, value):
        """
        Email only has to be unique within one organization. The same
        address may be reused by a different organization, so the
        duplicate check is always scoped to this employee's org
        rather than the whole table.
        """

        email = (value or "").strip()

        org_id = self._target_org_id()

        if not email or org_id is None:
            return email

        duplicates = Employee.objects.filter(org_id=org_id, email__iexact=email)

        if self.instance is not None:
            duplicates = duplicates.exclude(pk=self.instance.pk)

        if duplicates.exists():
            raise serializers.ValidationError(
                "An employee with this email already exists in this organization."
            )

        return email

    shift_name = serializers.CharField(source="shift.shift_name", read_only=True)

    shift_start_time = serializers.TimeField(
        source="shift.start_time",
        read_only=True,
        allow_null=True,
        default=None,
    )

    shift_end_time = serializers.TimeField(
        source="shift.end_time",
        read_only=True,
        allow_null=True,
        default=None,
    )

    shift_status = serializers.SerializerMethodField()

    service_ids = serializers.SerializerMethodField()
    is_available_now = serializers.SerializerMethodField()
    currently_serving_customer = serializers.SerializerMethodField()

    def get_shift_status(self, employee):
        return get_shift_window_status(employee.shift)

    rating = serializers.SerializerMethodField()

    def get_service_ids(self, employee):
        return list(
            employee.employee_services.filter(status="Active").values_list(
                "service_id", flat=True
            )
        )

    def get_rating(self, employee):
        return calculate_employee_rating(employee)

    def _current_service_row(self, employee):

        if hasattr(employee, "_current_service_row_cache"):
            return employee._current_service_row_cache

        from appointments.models import AppointmentService

        today = timezone.now().date()

        row = (
            AppointmentService.objects.select_related(
                "appointment", "appointment__customer"
            )
            .filter(
                employee_id=employee.employee_id,
                status="In Progress",
                appointment__date=today,
            )
            .first()
        )

        employee._current_service_row_cache = row
        return row

    def get_is_available_now(self, employee):
        if employee.status != "Active":
            return False
        if self.get_shift_status(employee) != "on_shift":
            return False
        return self._current_service_row(employee) is None

    def get_currently_serving_customer(self, employee):
        row = self._current_service_row(employee)
        if row is None:
            return None
        return row.appointment.customer.CustomerName

    class Meta:

        model = Employee

        fields = "__all__"

        extra_kwargs = {
            "password": {"write_only": True},
            "employee_id": {"read_only": True},
            "org": {"read_only": True},
            "created_by": {"read_only": True},
            "created_on": {"read_only": True},
            "updated_by": {"read_only": True},
            "updated_on": {"read_only": True},
        }


class ShiftSerializer(serializers.ModelSerializer):

    employee_count = serializers.SerializerMethodField()

    def get_employee_count(self, obj):
        return obj.employee_set.filter(status="Active").count()

    class Meta:

        model = Shift

        fields = "__all__"

        extra_kwargs = {
            "shift_id": {"read_only": True},
            "org": {"read_only": True},
            "category_id": {"read_only": True},
            "created_by": {"read_only": True},
            "created_on": {"read_only": True},
            "updated_by": {"read_only": True},
            "updated_on": {"read_only": True},
        }


class EmployeeServiceSerializer(serializers.ModelSerializer):

    employee_name = serializers.CharField(
        source="employee.employee_name", read_only=True
    )

    class Meta:

        model = EmployeeService

        fields = "__all__"

        extra_kwargs = {
            "employee_service_id": {"read_only": True},
            "created_by": {"read_only": True},
            "created_on": {"read_only": True},
            "updated_by": {"read_only": True},
            "updated_on": {"read_only": True},
        }