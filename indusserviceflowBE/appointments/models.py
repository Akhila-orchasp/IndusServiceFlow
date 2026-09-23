from django.db import models
from customers.models import Customer
from employees.models import Employee
from organizations.models import Organization
from services.models import Service


class Appointment(models.Model):

    STATUS_CHOICES = (
        ("Confirmed", "Confirmed"),
        ("Waiting", "Waiting"),
        ("In Progress", "In Progress"),
        ("Completed", "Completed"),
        ("Cancelled", "Cancelled"),
        ("No Show", "No Show"),
        ("Left Queue", "Left Queue"),
    )

    appointment_id = models.AutoField(primary_key=True, db_column="AppointmentId")

    appointment_number = models.CharField(
        max_length=20, unique=True, db_column="AppointmentNumber", db_index=True
    )

    token_number = models.CharField(
        max_length=20, db_column="TokenNumber", db_index=True
    )

    org = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column="OrgId",
        db_index=True,
        related_name="appointments",
    )

    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="appointments",
        db_column="CustomerId",
    )

    date = models.DateField(db_column="AppointmentDate", db_index=True)

    time = models.TimeField(db_column="AppointmentTime")

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Confirmed",
        db_column="Status",
        db_index=True,
    )

    total_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, db_column="TotalFee"
    )

    total_duration_min = models.PositiveIntegerField(
        default=0, db_column="TotalDurationMin"
    )

    remarks = models.TextField(null=True, blank=True, db_column="Remarks")

    is_active = models.BooleanField(default=True, db_column="IsActive")

    created_by = models.CharField(
        max_length=100, default="SYSTEM", db_column="CreatedBy"
    )

    created_on = models.DateTimeField(auto_now_add=True, db_column="CreatedOn")

    updated_by = models.CharField(
        max_length=100, null=True, blank=True, db_column="UpdatedBy"
    )

    updated_on = models.DateTimeField(auto_now=True, db_column="UpdatedOn")

    class Meta:

        db_table = "appointment"

        ordering = ["-date", "-time"]

        unique_together = [
            ("org", "date", "token_number"),
        ]

        indexes = [
            models.Index(fields=["appointment_number"]),
            models.Index(fields=["token_number"]),
            models.Index(fields=["date"]),
            models.Index(fields=["status"]),
            models.Index(fields=["org"]),
        ]

    def __str__(self):
        return self.appointment_number


class AppointmentService(models.Model):

    STATUS_CHOICES = (
        ("Pending", "Pending"),
        ("Confirmed", "Confirmed"),
        ("Waiting", "Waiting"),
        ("In Progress", "In Progress"),
        ("Completed", "Completed"),
        ("Cancelled", "Cancelled"),
        ("No Show", "No Show"),
        ("Left Queue", "Left Queue"),
    )

    appointment_service_id = models.AutoField(
        primary_key=True, db_column="AppointmentServiceId"
    )

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name="services",
        db_column="AppointmentId",
    )

    service = models.ForeignKey(
        Service,
        on_delete=models.PROTECT,
        related_name="appointment_services",
        db_column="ServiceId",
    )

    service_name = models.CharField(max_length=255, db_column="ServiceName")

    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointment_services",
        db_column="EmployeeId",
    )

    duration_min = models.PositiveIntegerField(default=0, db_column="DurationMin")

    started_at = models.DateTimeField(null=True, blank=True, db_column="StartedAt")

    completed_at = models.DateTimeField(null=True, blank=True, db_column="CompletedAt")

    actual_duration_min = models.PositiveIntegerField(
        null=True, blank=True, db_column="ActualDurationMin"
    )
    waiting_time_min = models.PositiveIntegerField(
        null=True, blank=True, db_column="WaitingTimeMin"
    )

    fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, db_column="Fee"
    )

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="Confirmed", db_column="Status"
    )

    created_by = models.CharField(
        max_length=100, default="SYSTEM", db_column="CreatedBy"
    )

    created_on = models.DateTimeField(auto_now_add=True, db_column="CreatedOn")

    updated_by = models.CharField(
        max_length=100, null=True, blank=True, db_column="UpdatedBy"
    )

    updated_on = models.DateTimeField(auto_now=True, db_column="UpdatedOn")

    class Meta:

        db_table = "appointmentservice"

        ordering = ["appointment_service_id"]

        indexes = [
            models.Index(fields=["appointment"]),
            models.Index(fields=["service"]),
            models.Index(fields=["employee"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.appointment.appointment_number} - {self.service_name}"
