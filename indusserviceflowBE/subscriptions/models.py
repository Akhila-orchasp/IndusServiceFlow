from django.db import models
from organizations.models import Organization
from plans.models import Plan


class Subscription(models.Model):

    BILLING_CYCLE_CHOICES = (
        ("Monthly", "Monthly"),
        ("Annual", "Annual"),
        ("Free Trial", "Free Trial"),
    )

    STATUS_CHOICES = (
        ("Pending Payment", "Pending Payment"),
        ("Pending Activation", "Pending Activation"),
        ("Active", "Active"),
        ("Expiring Soon", "Expiring Soon"),
        ("Expired", "Expired"),
        ("Locked", "Locked"),
        ("Cancelled", "Cancelled"),
    )

    PAYMENT_STATUS_CHOICES = (
        ("Pending", "Pending"),
        ("Paid", "Paid"),
        ("Failed", "Failed"),
        ("Refunded", "Refunded"),
    )

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="subscriptions"
    )

    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name="subscriptions"
    )

    billing_cycle = models.CharField(
        max_length=20,
        choices=BILLING_CYCLE_CHOICES,
        default="Free Trial"
    )

    employees = models.PositiveIntegerField(
        default=0,
        help_text=(
            "Legacaly/manual snapshot field — no longer used for display. "
            "The Employees column is now computed live from the organization's "
            "active employees (see live_employee_count() below), since org admins "
            "add/remove employees after a subscription is created and this stored "
            "value was never kept in sync."
        ),
    )

    monthly_revenue = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="Pending",
    )

    is_free_trial = models.BooleanField(default=False)

    razorpay_order_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_qr_code_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_qr_code_url = models.URLField(null=True, blank=True)
    start_date = models.DateField()

    next_payment_date = models.DateField(
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Pending Payment",   
    )

    created_by = models.CharField(max_length=100)
    created_on = models.DateTimeField(auto_now_add=True)
    updated_by = models.CharField(max_length=100, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions"
        ordering = ["-created_on"]

    def __str__(self):
        return f"{self.organization.organization_name} - {self.plan.plan_name}"

    def live_employee_count(self):
        """Actual current number of active employees under this
        subscription's organization — computed on demand instead of
        trusting the stored `employees` column, which is only ever set
        once (usually to 0) when the subscription is created and never
        updated afterwards as employees are added/removed."""
        if not self.organization_id:
            return 0
        return self.organization.employees.filter(status="Active").count()