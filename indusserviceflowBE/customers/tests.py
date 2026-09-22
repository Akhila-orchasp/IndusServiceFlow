from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Customer
from organizations.models import Organization
from categories.models import Category


class CustomerUpdateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(category_name="Test Category", created_by="test")
        self.org = Organization.objects.create(
            organization_name="Test Org", category=self.category, email="org-test@example.com",
            mobile="9876501234", address="Test Address", city="Test City", state="Test State", pincode="500001",
            created_by="test", status="Active"
        )
        User = get_user_model()
        self.user = User.objects.create_user(
            username="orgadmin_test", password="test-pass-123", organization=self.org
        )
        self.customer = Customer.objects.create(
            organization=self.org, CustomerName="Old Name", Mobile="9876543210",
            Email="old@example.com", Gender="Other", CreatedBy="test"
        )
        self.client.force_authenticate(self.user)

    def test_put_updates_customer(self):
        response = self.client.put(
            f"/api/customers/{self.customer.CustomerId}/",
            {
                "CustomerName": "New Name",
                "Mobile": "9876543210",
                "Email": "new@example.com",
                "Gender": "Other",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.CustomerName, "New Name")
        self.assertEqual(self.customer.Email, "new@example.com")

    def test_customer_create_and_delete_are_not_exposed(self):
        self.assertEqual(
            self.client.post("/api/customers/", {"CustomerName": "X"}, format="json").status_code,
            405,
        )
        self.assertEqual(
            self.client.delete(f"/api/customers/{self.customer.CustomerId}/").status_code,
            405,
        )
