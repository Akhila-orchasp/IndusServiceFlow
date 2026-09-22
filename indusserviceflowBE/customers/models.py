from django.db import models
from django.utils import timezone

from organizations.models import Organization


class Customer(models.Model):

    GENDER_CHOICES = (
        ("Male", "Male"),
        ("Female", "Female"),
        ("Other", "Other"),
    )

    CustomerId = models.AutoField(primary_key=True)

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column="OrganizationId",
        related_name="customers",
    )

    CustomerName = models.CharField(max_length=100)

    Mobile = models.CharField(max_length=15)

    Email = models.EmailField(null=True, blank=True)

    Gender = models.CharField(
        max_length=10, choices=GENDER_CHOICES, null=True, blank=True
    )

    CreatedBy = models.CharField(max_length=100)

    CreatedOn = models.DateTimeField(default=timezone.now)

    UpdatedBy = models.CharField(max_length=100, null=True, blank=True)

    UpdatedOn = models.DateTimeField(auto_now=True)

    class Meta:

        db_table = "customers"

        constraints = [
            models.UniqueConstraint(
                fields=["organization", "Mobile"], name="unique_customer_mobile_per_org"
            )
        ]

    def __str__(self):

        return self.CustomerName
