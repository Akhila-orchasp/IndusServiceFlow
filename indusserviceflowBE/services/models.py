from django.db import models

from organizations.models import Organization


class ServiceType(models.Model):

    STATUS_CHOICES = (
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    )

    service_type_id = models.AutoField(primary_key=True, db_column="ServiceTypeId")

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column="OrganizationId",
        related_name="service_types",
    )

    service_type_name = models.CharField(max_length=100, db_column="ServiceTypeName")

    description = models.TextField(blank=True, null=True, db_column="Description")

    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="Active", db_column="Status"
    )

    created_by = models.CharField(max_length=100, db_column="CreatedBy")

    created_on = models.DateTimeField(auto_now_add=True, db_column="CreatedOn")

    updated_by = models.CharField(max_length=100, db_column="UpdatedBy")

    updated_on = models.DateTimeField(auto_now=True, db_column="UpdatedOn")

    class Meta:
        db_table = "service_types"

        ordering = ["service_type_name"]

        constraints = [
            models.UniqueConstraint(
                fields=["organization", "service_type_name"],
                name="unique_service_type_per_org",
            ),
        ]

    def __str__(self):
        return self.service_type_name


class Service(models.Model):
    """
    Services under each Service Category

    Consultation
        - General Consultation
        - Cardiology Consultation

    Diagnostics
        - Blood Test
        - MRI Scan
    """

    STATUS_CHOICES = (
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    )

    service_id = models.AutoField(primary_key=True, db_column="ServiceId")

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column="OrganizationId",
        related_name="services",
    )

    service_name = models.CharField(max_length=150, db_column="ServiceName")

    service_type = models.ForeignKey(
        ServiceType,
        on_delete=models.PROTECT,
        related_name="services",
        db_column="ServiceTypeId",
    )

    duration = models.PositiveIntegerField(
        help_text="Duration in minutes", db_column="Duration"
    )

    fee = models.DecimalField(max_digits=10, decimal_places=2, db_column="Fee")

    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="Active", db_column="Status"
    )

    created_by = models.CharField(max_length=100, db_column="CreatedBy")

    created_on = models.DateTimeField(auto_now_add=True, db_column="CreatedOn")

    updated_by = models.CharField(max_length=100, db_column="UpdatedBy")

    updated_on = models.DateTimeField(auto_now=True, db_column="UpdatedOn")

    class Meta:
        db_table = "services"

        ordering = ["service_name"]

        constraints = [
            models.UniqueConstraint(
                fields=["organization", "service_name"], name="unique_service_per_org"
            )
        ]

    def __str__(self):
        return self.service_name
