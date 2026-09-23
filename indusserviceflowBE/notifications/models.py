from django.db import models
from django.utils import timezone

from customers.models import Customer
from employees.models import Employee
from appointments.models import Appointment
from organizations.models import Organization
from users.models import User


class Notification(models.Model):

    RECIPIENT_TYPE_CHOICES = (
        ("Customer", "Customer"),
        ("Employee", "Employee"),
        ("Organization", "Organization"),
        ("OrganizationAdmin", "Organization Admin"),
    )

    NOTIFICATION_TYPE_CHOICES = (
        ("Appointment Confirmation", "Appointment Confirmation"),
        ("Appointment Status Update", "Appointment Status Update"),
        ("Appointment Reminder", "Appointment Reminder"),
        ("Organization Registration", "Organization Registration"),
        ("Organization Status Update", "Organization Status Update"),
        ("Feedback Received", "Feedback Received"),
        ("General", "General"),
    )

    notification_id = models.AutoField(primary_key=True, db_column="NotificationId")

    org = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column="OrgId",
        db_index=True,
        related_name="notifications",
    )

    recipient_type = models.CharField(
        max_length=20, choices=RECIPIENT_TYPE_CHOICES, db_column="RecipientType"
    )

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
        db_column="CustomerId",
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
        db_column="EmployeeId",
    )

    recipient_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
        db_column="RecipientUserId",
    )

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
        db_column="AppointmentId",
    )

    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPE_CHOICES,
        default="General",
        db_column="NotificationType",
    )

    title = models.CharField(max_length=200, db_column="Title")

    message = models.TextField(db_column="Message")

    is_read = models.BooleanField(default=False, db_column="IsRead")

    created_on = models.DateTimeField(default=timezone.now, db_column="CreatedOn")

    read_on = models.DateTimeField(null=True, blank=True, db_column="ReadOn")

    class Meta:
        db_table = "notification"

        ordering = ["-created_on"]

        indexes = [
            models.Index(fields=["recipient_type"]),
            models.Index(fields=["customer"]),
            models.Index(fields=["employee"]),
            models.Index(fields=["recipient_user"]),
            models.Index(fields=["is_read"]),
            models.Index(fields=["org"]),
        ]

    def __str__(self):
        recipient = self.customer or self.employee or self.org
        return f"{self.notification_type} -> {recipient}"
