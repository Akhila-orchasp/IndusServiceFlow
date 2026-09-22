from django.db import transaction
from rest_framework import serializers

from .models import Organization
from users.models import User

import random

_PAYMENT_STATUS_MAP = {
    "Pending": "pending",
    "Paid": "paid",
    "Failed": "failed",
    "Refunded": "refunded",
}
_BILLING_CYCLE_MAP = {"Monthly": "monthly", "Annual": "annual", "Free Trial": "trial"}


def generate_username(name):

    first_name = name.strip().split()[0].lower()

    while True:
        username = f"{first_name}{random.randint(1000, 9999)}"

        if not User.objects.filter(username=username).exists():
            return username


class OrganizationRegistrationSerializer(serializers.ModelSerializer):

    contact_person_name = serializers.CharField(write_only=True)
    contact_email = serializers.EmailField(write_only=True)
    contact_mobile = serializers.CharField(write_only=True)

    class Meta:
        model = Organization
        fields = [
            "organization_name",
            "category",
            "email",
            "mobile",
            "address",
            "city",
            "state",
            "country",
            "pincode",
            "pan_number",
            "gst_number",
            "contact_person_name",
            "contact_email",
            "contact_mobile",
        ]

    def validate(self, attrs):

        if User.objects.filter(email=attrs["contact_email"]).exists():
            raise serializers.ValidationError(
                {"contact_email": "Contact email already exists."}
            )

        if User.objects.filter(mobile=attrs["contact_mobile"]).exists():
            raise serializers.ValidationError(
                {"contact_mobile": "Contact mobile already exists."}
            )

        if Organization.objects.filter(email=attrs["email"]).exists():
            raise serializers.ValidationError(
                {"email": "Organization email already exists."}
            )

        if Organization.objects.filter(mobile=attrs["mobile"]).exists():
            raise serializers.ValidationError(
                {"mobile": "Organization mobile already exists."}
            )

        if Organization.objects.filter(
            organization_name=attrs["organization_name"]
        ).exists():
            raise serializers.ValidationError(
                {"organization_name": "Organization name already exists."}
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):

        contact_person_name = validated_data.pop("contact_person_name")
        contact_email = validated_data.pop("contact_email")
        contact_mobile = validated_data.pop("contact_mobile")

        organization = Organization.objects.create(
            organization_name=validated_data["organization_name"],
            category=validated_data["category"],
            email=validated_data["email"],
            mobile=validated_data["mobile"],
            address=validated_data["address"],
            city=validated_data["city"],
            state=validated_data["state"],
            country=validated_data["country"],
            pincode=validated_data["pincode"],
            pan_number=validated_data.get("pan_number"),
            gst_number=validated_data.get("gst_number"),
            status="Pending",
            created_by="System",
        )

        username = generate_username(contact_person_name)

        user = User.objects.create(
            username=username,
            name=contact_person_name,
            email=contact_email,
            mobile=contact_mobile,
            role="ORG_ADMIN",
            organization=organization,
            status="Pending",
            created_by="System",
        )

        user.set_unusable_password()
        user.save()

        return {
            "organization": organization,
            "contact_person_name": contact_person_name,
            "contact_email": contact_email,
        }


class OrganizationSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source="category.category_name", read_only=True
    )

    contact_person_name = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    billing_cycle = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    payment_amount = serializers.SerializerMethodField()
    is_free_trial = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = "__all__"

    def _latest_subscription(self, obj):

        prefetched = getattr(obj, "prefetched_subscriptions", None)

        if prefetched is not None:
            return prefetched[0] if prefetched else None

        return obj.subscriptions.select_related("plan").order_by("-created_on").first()

    def get_contact_person_name(self, obj):

        prefetched = getattr(obj, "prefetched_org_admin", None)

        if prefetched is not None:
            org_admin = prefetched[0] if prefetched else None
        else:
            org_admin = obj.users.filter(role="ORG_ADMIN").order_by("date_joined").first()

        return org_admin.name if org_admin else None

    def get_plan_name(self, obj):
        subscription = self._latest_subscription(obj)
        return subscription.plan.plan_name if subscription else None

    def get_billing_cycle(self, obj):
        subscription = self._latest_subscription(obj)

        if not subscription:
            return None

        return _BILLING_CYCLE_MAP.get(subscription.billing_cycle)

    def get_payment_status(self, obj):
        subscription = self._latest_subscription(obj)

        if not subscription:
            return None

        return _PAYMENT_STATUS_MAP.get(subscription.payment_status)

    def get_payment_amount(self, obj):
        subscription = self._latest_subscription(obj)
        return subscription.amount if subscription else None

    def get_is_free_trial(self, obj):
        subscription = self._latest_subscription(obj)
        return subscription.is_free_trial if subscription else None


class DashboardStatsSerializer(serializers.Serializer):
    patients_today = serializers.IntegerField()
    patients_served = serializers.IntegerField()
    active_queue = serializers.IntegerField()
    avg_wait_time = serializers.IntegerField()
    max_wait_time = serializers.IntegerField()
    queue_length = serializers.IntegerField()
    employee_utilization = serializers.FloatField()
    peak_hour = serializers.CharField()
    period_start = serializers.CharField()
    period_end = serializers.CharField()


class QueueLengthTrendSerializer(serializers.Serializer):
    time = serializers.CharField()
    value = serializers.IntegerField()


class ServiceDistributionSerializer(serializers.Serializer):
    name = serializers.CharField()
    value = serializers.IntegerField()
    pct = serializers.IntegerField()
    color = serializers.CharField()


class WaitTimeTrendSerializer(serializers.Serializer):
    time = serializers.CharField()
    value = serializers.FloatField()


class EmployeeUtilizationSerializer(serializers.Serializer):
    name = serializers.CharField()
    value = serializers.FloatField()


class PeakHourSerializer(serializers.Serializer):
    hour = serializers.CharField()
    value = serializers.IntegerField()


class CustomerFlowSerializer(serializers.Serializer):
    slot = serializers.CharField()
    booked = serializers.IntegerField()
    served = serializers.IntegerField()


class WaitDistributionSerializer(serializers.Serializer):
    range = serializers.CharField()
    value = serializers.IntegerField()


class QueueStatusSerializer(serializers.Serializer):
    label = serializers.CharField()
    value = serializers.IntegerField()
    pct = serializers.IntegerField()
    color = serializers.CharField()