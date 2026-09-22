from datetime import datetime, timezone as dt_timezone
from datetime import timedelta

from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from organizations.models import Organization
from categories.models import Category
from users.models import User
from plans.models import Plan
from subscriptions.models import Subscription


from rest_framework.decorators import (
    api_view,
    permission_classes,
)

from rest_framework.permissions import (
    AllowAny,
    IsAdminUser,
)

from rest_framework.response import Response

from rest_framework import status

from .models import ContactMessage

from .serializers import ContactMessageSerializer

MONTH_LABELS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]


def _last_12_months():
    """Returns list of (year, month, label) for the last 12 months, oldest first."""
    now = timezone.now()
    months = []
    for i in range(11, -1, -1):
        y, m = now.year, now.month - i
        while m <= 0:
            m += 12
            y -= 1
        months.append((y, m, MONTH_LABELS[m - 1]))
    return months


def _month_bounds(y, m):
    start = datetime(y, m, 1, tzinfo=dt_timezone.utc)
    if m == 12:
        end = datetime(y + 1, 1, 1, tzinfo=dt_timezone.utc)
    else:
        end = datetime(y, m + 1, 1, tzinfo=dt_timezone.utc)
    return start, end


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(request):

    active_orgs_qs = Organization.objects.filter(is_deleted=False)

    total_organizations = active_orgs_qs.count()

    active_organizations = active_orgs_qs.filter(status__iexact="active").count()

    pending_requests = active_orgs_qs.filter(status__iexact="pending").count()

    monthly_revenue = (
        Subscription.objects.filter(status__iexact="active").aggregate(
            total=Sum("monthly_revenue")
        )["total"]
        or 0
    )

    months = _last_12_months()
    org_growth = []
    for y, m, label in months:
        start, end = _month_bounds(y, m)
        count = active_orgs_qs.filter(created_on__gte=start, created_on__lt=end).count()
        org_growth.append({"month": label, "organizations": count})

    now = timezone.now()
    mrr_growth = []
    for i in range(3, -1, -1):
        week_end = now - timedelta(weeks=i)
        mrr = (
            Subscription.objects.filter(
                status__iexact="active", created_on__lte=week_end
            ).aggregate(total=Sum("monthly_revenue"))["total"]
            or 0
        )
        tenants = active_orgs_qs.filter(created_on__lte=week_end).count()
        mrr_growth.append({"week": f"W{4 - i}", "mrr": mrr, "tenants": tenants})

    category_mix_qs = (
        active_orgs_qs.values("category__category_name")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    category_mix = [
        {
            "category": row["category__category_name"] or "Uncategorized",
            "count": row["count"],
        }
        for row in category_mix_qs
    ]

    plan_distribution_qs = (
        Subscription.objects.filter(status__iexact="active")
        .values("plan__plan_name")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    plan_distribution = [
        {"plan": row["plan__plan_name"] or "Unknown", "count": row["count"]}
        for row in plan_distribution_qs
    ]

    last_6_months = months[-6:]

    all_subs = list(
        Subscription.objects.select_related("plan")
        .order_by("organization_id", "created_on", "id")
    )

    sub_kind = {}
    previous_price_by_org = {}
    for sub in all_subs:
        prev_price = previous_price_by_org.get(sub.organization_id)
        if prev_price is None:
            sub_kind[sub.id] = "new"
        elif sub.plan.monthly_price > prev_price:
            sub_kind[sub.id] = "upgrade"
        elif sub.plan.monthly_price < prev_price:
            sub_kind[sub.id] = "downgrade"
        else:
            sub_kind[sub.id] = "same"
        previous_price_by_org[sub.organization_id] = sub.plan.monthly_price

    subscription_changes = []
    for y, m, label in last_6_months:
        start, end = _month_bounds(y, m)
        month_subs = [s for s in all_subs if start <= s.created_on < end]
        subscription_changes.append(
            {
                "month": label,
                "new_signups": sum(1 for s in month_subs if sub_kind[s.id] == "new"),
                "upgrades": sum(1 for s in month_subs if sub_kind[s.id] == "upgrade"),
                "downgrades": sum(1 for s in month_subs if sub_kind[s.id] == "downgrade"),
            }
        )

    data = {
        "cards": {
            "total_organizations": total_organizations,
            "active_organizations": active_organizations,
            "pending_requests": pending_requests,
            "monthly_revenue": monthly_revenue,
        },
        "organization_growth": org_growth,
        "mrr_growth": mrr_growth,
        "category_mix": category_mix,
        "plan_distribution": plan_distribution,
        "subscription_changes": subscription_changes,
    }

    return Response(
        {
            "message": "Dashboard Retrieved Successfully",
            "data": data,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def create_contact_message(request):

    serializer = ContactMessageSerializer(data=request.data)

    if serializer.is_valid():

        serializer.save()

        return Response(
            {
                "success": True,
                "message": (
                    "Message sent successfully. "
                    "Our team will get back to you shortly."
                ),
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(
        {
            "success": False,
            "message": "Please correct the errors.",
            "errors": serializer.errors,
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_contact_messages(request):

    messages = ContactMessage.objects.all()

    serializer = ContactMessageSerializer(
        messages,
        many=True,
    )

    return Response(
        {
            "success": True,
            "count": messages.count(),
            "data": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def mark_contact_message_read(
    request,
    message_id,
):

    try:
        contact_message = ContactMessage.objects.get(id=message_id)

    except ContactMessage.DoesNotExist:

        return Response(
            {
                "success": False,
                "message": "Message not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    contact_message.is_read = True

    contact_message.save(update_fields=["is_read"])

    return Response(
        {
            "success": True,
            "message": "Message marked as read.",
        },
        status=status.HTTP_200_OK,
    )