from django.db import models


class Organization(models.Model):

    STATUS_CHOICES = (
        ("Pending", "Pending"),
        ("Approved", "Approved"),
        ("Rejected", "Rejected"),
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    )

    organization_name = models.CharField(
        max_length=150,
        unique=True
    )

    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.CASCADE,
        related_name="organizations"
    )

    email = models.EmailField(
        unique=True
    )

    mobile = models.CharField(
        max_length=10,
        unique=True
    )

    address = models.TextField()

    city = models.CharField(
        max_length=100
    )

    state = models.CharField(
        max_length=100
    )

    country = models.CharField(
        max_length=100,
        default="India"
    )

    pincode = models.CharField(
        max_length=6
    )

    pan_number = models.CharField(
        max_length=10,
        blank=True,
        null=True
    )

    gst_number = models.CharField(
        max_length=15,
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Pending"
    )

    created_by = models.CharField(
        max_length=100
    )

    created_on = models.DateTimeField(
        auto_now_add=True
    )

    updated_by = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    updated_on = models.DateTimeField(
        auto_now=True
    )

    is_deleted = models.BooleanField(
        default=False
    )

    class Meta:
        db_table = "organizations"
        ordering = ["organization_name"]

    def __str__(self):
        return self.organization_name