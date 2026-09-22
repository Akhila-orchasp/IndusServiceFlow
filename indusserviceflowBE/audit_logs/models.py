from django.db import models
from organizations.models import Organization


class AuditLog(models.Model):

    ACTION_CHOICES = (
        ("Login", "Login"),
        ("Logout", "Logout"),
        ("Create", "Create"),
        ("Update", "Update"),
        ("Delete", "Delete"),
        ("Export", "Export"),
        ("Approve", "Approve"),
        ("Reject", "Reject"),
        ("Assign", "Assign"),
        ("Status Change", "Status Change"),
        ("View", "View"),
    )

    ROLE_CHOICES = (
        ("Super Admin", "Super Admin"),
        ("Organization Admin", "Organization Admin"),
        ("Employee", "Employee"),
    )

    audit_date = models.DateTimeField(auto_now_add=True)

    action_name = models.CharField(max_length=30, choices=ACTION_CHOICES)
    action_screen = models.CharField(max_length=100)

    username = models.CharField(max_length=100)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES)

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=True
    )

    target_info = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-audit_date"]

    def __str__(self):
        return self.username
