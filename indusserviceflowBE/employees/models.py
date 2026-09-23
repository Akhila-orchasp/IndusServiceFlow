from django.db import models
from django.db.models.functions import Lower
from services.models import Service
from organizations.models import Organization


class Shift(models.Model):

    STATUS_CHOICES = (
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    )

    shift_id = models.AutoField(primary_key=True, db_column="ShiftId")

    category_id = models.IntegerField(
        null=True,
        blank=True,
        db_column="CategoryId",
        db_index=True,
    )

    org = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column="OrgId",
        related_name="shifts",
    )

    shift_name = models.CharField(max_length=100, db_column="ShiftName")

    start_time = models.TimeField(db_column="StartTime")

    end_time = models.TimeField(db_column="EndTime")

    duration_hours = models.DecimalField(
        max_digits=4, decimal_places=1, default=8, db_column="DurationHours"
    )

    break_start = models.TimeField(null=True, blank=True, db_column="BreakStart")

    break_end = models.TimeField(null=True, blank=True, db_column="BreakEnd")

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="Active", db_column="Status"
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
        db_table = "shift"

    def __str__(self):
        return self.shift_name


class Employee(models.Model):

    STATUS_CHOICES = (
        ("Active", "Active"),
        ("Inactive", "Inactive"),
        ("On Hold", "On Hold"),
    )

    employee_id = models.AutoField(primary_key=True, db_column="EmployeeId")

    employee_code = models.CharField(
        max_length=50, unique=True, db_column="EmployeeCode"
    )

    org = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column="OrgId",
        related_name="employees",
    )

    shift = models.ForeignKey(
        Shift, on_delete=models.SET_NULL, null=True, blank=True, db_column="ShiftId"
    )

    username = models.CharField(max_length=100, unique=True, db_column="Username")

    password = models.CharField(max_length=255, db_column="Password")

    must_change_password = models.BooleanField(
        default=True, db_column="MustChangePassword"
    )

    employee_name = models.CharField(max_length=255, db_column="EmployeeName")

    designation = models.CharField(max_length=255, db_column="Designation")

    mobile = models.CharField(max_length=15, db_column="Mobile")

    email = models.EmailField(db_column="Email")

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="Active", db_column="Status"
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
        db_table = "employee"

        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                "org",
                name="uniq_employee_email_per_org",
            )
        ]

    def __str__(self):
        return self.employee_name


class EmployeeService(models.Model):

    STATUS_CHOICES = (
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    )

    employee_service_id = models.AutoField(
        primary_key=True, db_column="EmployeeServiceId"
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="employee_services",
        db_column="EmployeeId",
    )

    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name="employee_services",
        db_column="ServiceId",
    )

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="Active", db_column="Status"
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
        db_table = "employeeservices"
        unique_together = (("employee", "service"),)

    def __str__(self):
        return f"{self.employee.employee_name} - {self.service}"