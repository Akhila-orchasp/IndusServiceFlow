from rest_framework import serializers
from .models import Plan


class PlanSerializer(serializers.ModelSerializer):

    class Meta:
        model = Plan
        fields = [
            "id",
            "plan_name",
            "monthly_price",
            "annual_price",
            "employee_limit",
            "queue_limit",
            "description",
            "status",
            "trial_days",
            "is_popular",
            "features",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]

        read_only_fields = (
            "id",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        )

    def validate_plan_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError("Plan name is required.")

        queryset = Plan.objects.filter(plan_name__iexact=value)

        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)

        if queryset.exists():
            raise serializers.ValidationError("Plan name already exists.")

        return value

    def validate_monthly_price(self, value):

        if value < 0:
            raise serializers.ValidationError("Monthly price cannot be negative.")

        return value

    def validate_annual_price(self, value):

        if value < 0:
            raise serializers.ValidationError("Annual price cannot be negative.")

        return value

    def validate_employee_limit(self, value):

        if value is not None and value < 0:
            raise serializers.ValidationError("Employee limit cannot be negative.")

        return value

    def validate_queue_limit(self, value):

        if value is not None and value < 0:
            raise serializers.ValidationError("Queue limit cannot be negative.")

        return value

    def validate_status(self, value):

        if value not in ["Active", "Inactive"]:
            raise serializers.ValidationError("Status must be Active or Inactive.")

        return value

    def validate_trial_days(self, value):

        if value is not None and value <= 0:
            raise serializers.ValidationError(
                "Trial length must be a positive number of days."
            )

        return value

    def validate_features(self, value):

        if not isinstance(value, list):
            raise serializers.ValidationError("Features must be a list of objects.")

        for item in value:
            if (
                not isinstance(item, dict)
                or "label" not in item
                or "included" not in item
            ):
                raise serializers.ValidationError(
                    "Each feature must be an object like "
                    '{"label": "...", "included": true/false}.'
                )

        return value


class PublicPlanSerializer(serializers.ModelSerializer):
    """Public-safe subset of Plan fields, used on the unauthenticated
    registration/renewal pricing cards. Deliberately excludes status,
    created_by/on, updated_by/on — those are admin-only."""

    trial_available = serializers.SerializerMethodField()
    # Overrides the raw `annual_price` column with Plan.annual_total
    # (monthly_price × 12) so the price shown here can never drift from
    # what registration/renewal actually charge. See Plan.annual_total.
    annual_price = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            "id",
            "plan_name",
            "description",
            "monthly_price",
            "annual_price",
            "employee_limit",
            "queue_limit",
            "features",
            "trial_days",
            "trial_available",
        ]

    def get_trial_available(self, obj):
        return obj.trial_days is not None

    def get_annual_price(self, obj):
        return obj.annual_total