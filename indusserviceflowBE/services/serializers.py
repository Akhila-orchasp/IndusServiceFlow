from rest_framework import serializers

from .models import ServiceType, Service


class ServiceTypeSerializer(serializers.ModelSerializer):

    organization_id = serializers.IntegerField(
        read_only=True,
    )

    category_id = serializers.IntegerField(
        read_only=True,
    )

    services_count = serializers.IntegerField(
        read_only=True,
        required=False,
    )

    class Meta:
        model = ServiceType

        fields = (
            "service_type_id",
            "organization_id",
            "category_id",
            "service_type_name",
            "description",
            "status",
            "services_count",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        )

        read_only_fields = (
            "service_type_id",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        )


class ServiceSerializer(serializers.ModelSerializer):
    service_type_name = serializers.CharField(
        source="service_type.service_type_name", read_only=True
    )

    organization_id = serializers.IntegerField(
        read_only=True,
    )

    class Meta:
        model = Service

        fields = (
            "service_id",
            "organization_id",
            "service_name",
            "service_type",
            "service_type_name",
            "duration",
            "fee",
            "status",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        )

        read_only_fields = (
            "service_id",
            "service_type_name",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        )
