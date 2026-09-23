from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from appointments.models import Appointment, AppointmentService
from customers.models import Customer
from employees.models import Employee
from organizations.models import Organization


class FeedbackRequest(models.Model):

    feedback_request_id = models.AutoField(
        primary_key=True, db_column="FeedbackRequestId"
    )

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name="feedback_requests",
        db_column="AppointmentId",
    )

    appointment_service = models.OneToOneField(
        AppointmentService,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="feedback_request",
        db_column="AppointmentServiceId",
    )

    token = models.CharField(
        max_length=64, unique=True, db_index=True, db_column="Token"
    )

    created_on = models.DateTimeField(auto_now_add=True, db_column="CreatedOn")

    expires_on = models.DateTimeField(db_column="ExpiresOn")

    is_submitted = models.BooleanField(default=False, db_column="IsSubmitted")

    submitted_on = models.DateTimeField(null=True, blank=True, db_column="SubmittedOn")

    class Meta:

        db_table = "feedbackrequest"

        ordering = ["-created_on"]

        indexes = [
            models.Index(fields=["token"]),
            models.Index(fields=["appointment"]),
        ]

    def __str__(self):
        return f"FeedbackRequest for {self.appointment.appointment_number}"


class Feedback(models.Model):
    """
    A customer's rating for a single service leg (AppointmentService)
    of a completed appointment. This is the *only* source customers
    can write into - it never touches Employee directly. See
    employees.utils.calculate_employee_rating(), which now averages
    these rows for a given employee instead of deriving a score from
    completion/no-show/cancellation stats.
    """

    feedback_id = models.AutoField(primary_key=True, db_column="FeedbackId")

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name="feedback_entries",
        db_column="AppointmentId",
    )

    appointment_service = models.OneToOneField(
        AppointmentService,
        on_delete=models.CASCADE,
        related_name="feedback",
        db_column="AppointmentServiceId",
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedback_entries",
        db_column="EmployeeId",
    )

    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedback_entries",
        db_column="CustomerId",
    )

    org = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedback_entries",
        db_column="OrgId",
    )

    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)], db_column="Rating"
    )

    comment = models.TextField(null=True, blank=True, db_column="Comment")

    created_on = models.DateTimeField(auto_now_add=True, db_column="CreatedOn")

    class Meta:

        db_table = "Feedback"

        ordering = ["-created_on"]

        indexes = [
            models.Index(fields=["employee"]),
            models.Index(fields=["appointment"]),
            models.Index(fields=["org"]),
        ]

    def __str__(self):
        return f"Feedback({self.rating}) - {self.appointment_service_id}"