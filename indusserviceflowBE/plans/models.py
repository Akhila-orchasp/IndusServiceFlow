from django.db import models


class Plan(models.Model):

    STATUS_CHOICES = [
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    ]

    plan_name = models.CharField(max_length=100, unique=True)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2)
    annual_price = models.DecimalField(max_digits=10, decimal_places=2)

    employee_limit = models.PositiveIntegerField(null=True, blank=True)

    queue_limit = models.PositiveIntegerField(null=True, blank=True)

    description = models.TextField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Active")

    trial_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Leave blank for a paid plan. Set to mark this as a free trial.",
    )

    is_popular = models.BooleanField(default=False)

    features = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            'List of {"label": str, "included": bool} objects, '
            'e.g. [{"label": "Email support", "included": true}]'
        ),
    )

    created_by = models.CharField(max_length=100)

    created_on = models.DateTimeField(auto_now_add=True)

    updated_by = models.CharField(max_length=100, blank=True, null=True)

    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "plans"
        ordering = ["monthly_price"]

    def __str__(self):
        return self.plan_name

    @property
    def annual_total(self):
        if self.monthly_price == 0:
            return self.monthly_price
        return self.monthly_price * 12