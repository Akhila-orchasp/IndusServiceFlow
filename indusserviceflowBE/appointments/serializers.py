from rest_framework import serializers
from .models import Appointment, AppointmentService
from .utils import compute_service_leg_start_times


class AppointmentServiceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.employee_name", read_only=True
    )

    service_name = serializers.CharField(read_only=True)

    start_time = serializers.SerializerMethodField()

    def get_start_time(self, obj):
        return getattr(obj, "_computed_start_time", None)

    class Meta:
        model = AppointmentService

        fields = (
            "appointment_service_id",
            "appointment",
            "service",
            "service_name",
            "employee",
            "employee_name",
            "duration_min",
            "started_at",
            "completed_at",
            "actual_duration_min",
            "start_time",
            "fee",
            "status",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        )

        read_only_fields = (
            "appointment_service_id",
            "appointment",
            "service",
            "service_name",
            "duration_min",
            "started_at",
            "completed_at",
            "actual_duration_min",
            "fee",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        )


class AppointmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.CustomerName", read_only=True
    )

    customer_mobile = serializers.CharField(source="customer.Mobile", read_only=True)

    customer_email = serializers.CharField(source="customer.Email", read_only=True)

    services = serializers.SerializerMethodField()

    def get_services(self, obj):
        service_rows = list(obj.services.all())

        legs = compute_service_leg_start_times(obj.time, service_rows)

        for row, start_time in legs:
            row._computed_start_time = start_time

        return AppointmentServiceSerializer([row for row, _ in legs], many=True).data

    class Meta:
        model = Appointment

        fields = (
            "appointment_id",
            "appointment_number",
            "token_number",
            "org_id",
            "customer",
            "customer_name",
            "customer_mobile",
            "customer_email",
            "date",
            "time",
            "status",
            "total_fee",
            "total_duration_min",
            "remarks",
            "is_active",
            "services",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        )

        read_only_fields = (
            "appointment_id",
            "appointment_number",
            "token_number",
            "org_id",
            "total_fee",
            "total_duration_min",
            "customer_name",
            "customer_mobile",
            "customer_email",
            "is_active",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        )
