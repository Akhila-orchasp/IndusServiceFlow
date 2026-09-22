from rest_framework import serializers
from .models import Subscription
from organizations.models import Organization
from plans.models import Plan


def get_display_status(subscription):
    """Effective status to *show*, layered on top of the raw subscription
    status by the organization's approval state:
      - Organization is still awaiting Super Admin approval ("Pending") ->
        always "Pending", regardless of whether the underlying row is sitting
        at "Pending Payment" or "Pending Activation" — the Super Admin only
        needs to know the org (and its subscription) is awaiting a decision.
      - Organization was rejected -> always "Cancelled". A rejected org was
        never a real subscriber, and reject_organization() now cancels the
        row on rejection; this also covers any legacy row rejected before
        that fix existed.
      - Otherwise -> the subscription's own status, unchanged.

    NOTE: this only changes what is *displayed*; the raw `status` field on
    the model/serializer is left untouched so existing flows that key off
    the granular "Pending Payment" / "Pending Activation" values (e.g. the
    force-activate action) keep working.
    """
    org_status = getattr(subscription.organization, "status", None)
    if org_status == "Rejected":
        return "Cancelled"
    if org_status == "Pending":
        return "Pending"
    return subscription.status


class SubscriptionSerializer(serializers.ModelSerializer):

    organization_name = serializers.CharField(
        source="organization.organization_name", read_only=True
    )
    plan_name = serializers.CharField(source="plan.plan_name", read_only=True)

    customer_since = serializers.DateField(source="start_date", read_only=True)
    next_payment = serializers.DateField(source="next_payment_date", read_only=True)

    employees = serializers.SerializerMethodField()

    # Display-only status — see get_display_status() above. The main
    # Subscriptions table/status filter/exports use this; the raw `status`
    # field is still available for any flow that needs the granular value.
    display_status = serializers.SerializerMethodField()

    def get_employees(self, obj):
        annotated = getattr(obj, "live_employees", None)
        if annotated is not None:
            return annotated
        return obj.live_employee_count()

    def get_display_status(self, obj):
        return get_display_status(obj)

    class Meta:
        model = Subscription
        fields = "__all__"
        read_only_fields = (
            "id",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        )

    def validate(self, attrs):

        organization = attrs.get("organization")
        plan = attrs.get("plan")
        billing_cycle = attrs.get("billing_cycle")
        monthly_revenue = attrs.get("monthly_revenue")
        start_date = attrs.get("start_date")
        next_payment_date = attrs.get("next_payment_date")
        status = attrs.get("status")

        # Organization must exist
        if not Organization.objects.filter(id=organization.id).exists():
            raise serializers.ValidationError(
                {"organization": "Organization does not exist."}
            )

        # Plan must exist
        if not Plan.objects.filter(id=plan.id).exists():
            raise serializers.ValidationError({"plan": "Plan does not exist."})

        if self.instance is None:
            if Subscription.objects.filter(
                organization=organization, status="Active"
            ).exists():
                raise serializers.ValidationError(
                    {
                        "organization": "This organization already has an active subscription."
                    }
                )

        if monthly_revenue is not None and monthly_revenue < 0:
            raise serializers.ValidationError(
                {"monthly_revenue": "Monthly revenue cannot be negative."}
            )

        if billing_cycle != "Free Trial" and next_payment_date is not None:
            if next_payment_date <= start_date:
                raise serializers.ValidationError(
                    {"next_payment_date": "Next payment date must be after start date."}
                )

        allowed_status = ["Active", "Expiring Soon", "Expired", "Cancelled"]

        if status not in allowed_status:
            raise serializers.ValidationError(
                {"status": "Invalid subscription status."}
            )

        return attrs
