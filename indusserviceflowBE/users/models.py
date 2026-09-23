from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):

    STATUS_CHOICES = (
        ("Pending", "Pending"),
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    )

    ROLE_CHOICES = (
        ("SUPER_ADMIN", "Super Admin"),
        ("ORG_ADMIN", "Organization Admin"),
    )

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="users"
    )

    name = models.CharField(
        max_length=150
    )

    mobile = models.CharField(
        max_length=15,
        unique=True
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Pending"
    )
    reset_otp = models.CharField(
        max_length=6,
        blank=True,
        null=True
    )

    reset_otp_created_at = models.DateTimeField(
        blank=True,
        null=True
    )

    created_by = models.CharField(
        max_length=150,
        default="System"
    )

    created_on = models.DateTimeField(
        auto_now_add=True
    )

    updated_by = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    updated_on = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "users"
        ordering = ["id"]

    def __str__(self):
        return self.username