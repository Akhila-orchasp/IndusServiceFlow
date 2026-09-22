from rest_framework import serializers

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    OrganizationId = serializers.IntegerField(
        source="organization_id",
        read_only=True,
    )

    class Meta:

        model = Customer

        fields = [
            "CustomerId",
            "OrganizationId",
            "CustomerName",
            "Mobile",
            "Email",
            "Gender",
            "CreatedBy",
            "CreatedOn",
            "UpdatedBy",
            "UpdatedOn",
        ]

        read_only_fields = [
            "CustomerId",
            "CreatedBy",
            "CreatedOn",
            "UpdatedOn",
        ]