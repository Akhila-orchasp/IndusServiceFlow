from django.db import models


class Category(models.Model):

    STATUS_CHOICES = (
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    )

    category_name = models.CharField(max_length=100, unique=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Active")

    created_by = models.CharField(max_length=100)

    created_on = models.DateTimeField(auto_now_add=True)

    updated_by = models.CharField(max_length=100, blank=True, null=True)

    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "categories"
        ordering = ["category_name"]

    def __str__(self):
        return self.category_name
