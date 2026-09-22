from django.conf import settings
from django.db import models
from django.conf import settings


class OrganizationMember(models.Model):
    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("member", "Member"),
        ("viewer", "Viewer"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships"
    )

    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="members"
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "organization_members"
        unique_together = ("user", "organization")

    def __str__(self):
        return f"{self.user.username} @ {self.organization.organization_name}"


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
