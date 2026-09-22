from django.core.mail import send_mail
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from audit_logs.utils import log_action

from .models import Plan
from .serializers import PlanSerializer, PublicPlanSerializer

from subscriptions.models import Subscription


def _badge_for(plan):
    """Priority: free trial beats "most popular" — a plan can be both
    the trial plan and marked popular, but the trial ribbon always
    wins visually (matches the form's help text)."""
    if plan.trial_days is not None:
        return "free_trial"
    if plan.is_popular:
        return "popular"
    return "none"


def _icon_for(plan, all_plans_sorted_by_price):
    """No icon field in the create form, so assign one automatically:
    trial plan -> magic, the popular plan -> users, the most expensive
    remaining plan -> building, everything else -> bolt."""
    if plan.trial_days is not None:
        return "magic"
    if plan.is_popular:
        return "users"

    non_special = [
        p
        for p in all_plans_sorted_by_price
        if p.trial_days is None and not p.is_popular
    ]
    if non_special and plan.id == non_special[-1].id:
        return "building"
    return "bolt"


def _active_orgs_for_plan(plan_name):
    """Count organizations on this plan that are currently Active.
    plan is a ForeignKey on Subscription, so traverse it as
    plan__plan_name (not plan_name). Distinct by organization and excludes
    Rejected orgs for the same reasons as subscriptions/views.py — a
    duplicate Active row, or a stale Active row on a Rejected org, must not
    inflate this count."""
    return (
        Subscription.objects.filter(
            plan__plan_name__iexact=plan_name,
            status="Active",
        )
        .exclude(organization__status="Rejected")
        .values("organization")
        .distinct()
        .count()
    )


def _build_stats(plans, plans_with_counts):
    total_plans = len(plans_with_counts)

    active_subs = Subscription.objects.filter(status="Active").exclude(
        organization__status="Rejected"
    )

    active_organizations = active_subs.values("organization").distinct().count()

    popular_plan = next((p for p in plans if p.is_popular), None)
    most_popular_plan = popular_plan.plan_name if popular_plan else "-"

    on_free_trial = (
        active_subs.filter(billing_cycle="Free Trial")
        .values("organization")
        .distinct()
        .count()
    )

    on_hold = 0

    return {
        "total_plans": total_plans,
        "active_organizations": active_organizations,
        "most_popular_plan": most_popular_plan,
        "on_free_trial": on_free_trial,
        "on_hold": on_hold,
    }


def _unset_other_popular_plans(current_plan_id=None):
    """Enforce: only one Active plan can be is_popular=True at a time."""
    queryset = Plan.objects.filter(is_popular=True)
    if current_plan_id is not None:
        queryset = queryset.exclude(id=current_plan_id)
    queryset.update(is_popular=False)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_plan(request):

    if request.user.role != "SUPER_ADMIN":
        return Response(
            {"success": False, "message": "Only Super Admin can add plans."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = PlanSerializer(data=request.data)

    if serializer.is_valid():

        plan = serializer.save(created_by=request.user.username)

        if plan.is_popular:
            _unset_other_popular_plans(current_plan_id=plan.id)

        log_action(request.user, "Create", "Plans")

        return Response(
            {
                "success": True,
                "message": "Plan added successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(
        {"success": False, "errors": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_plans(request):

    status_param = request.GET.get("status")

    if status_param and status_param.lower() != "all":
        plan_queryset = Plan.objects.filter(status=status_param)
    elif status_param and status_param.lower() == "all":
        plan_queryset = Plan.objects.all()
    else:
        plan_queryset = Plan.objects.filter(status="Active")

    plans = list(plan_queryset.order_by("monthly_price"))

    plans_with_counts = [
        (plan, _active_orgs_for_plan(plan.plan_name)) for plan in plans
    ]

    serializer = PlanSerializer(plans, many=True)

    data = []
    for (plan, active_orgs), plan_data in zip(plans_with_counts, serializer.data):
        plan_data = dict(plan_data)
        plan_data["active_orgs"] = active_orgs
        plan_data["badge"] = _badge_for(plan)
        plan_data["icon"] = _icon_for(plan, plans)
        data.append(plan_data)

    stats = _build_stats(plans, plans_with_counts)

    return Response(
        {"success": True, "count": len(plans), "stats": stats, "data": data},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def public_plans(request):
    """Active plans only, trimmed to public-safe fields (no status,
    created_by/on, updated_by/on). Used by the unauthenticated
    "Select a plan" step of registration and renewal — badge/icon are
    computed the same way as get_plans so pricing cards match exactly
    what the Super Admin sees internally."""

    plans = list(Plan.objects.filter(status="Active").order_by("monthly_price"))

    serializer = PublicPlanSerializer(plans, many=True)

    data = []
    for plan, plan_data in zip(plans, serializer.data):
        plan_data = dict(plan_data)
        plan_data["badge"] = _badge_for(plan)
        plan_data["icon"] = _icon_for(plan, plans)
        data.append(plan_data)

    return Response(
        {
            "success": True,
            "data": data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_plan(request, id):

    plan = get_object_or_404(
        Plan,
        id=id,
    )

    all_active_plans = list(
        Plan.objects.filter(status="Active").order_by("monthly_price")
    )

    serializer = PlanSerializer(plan)
    plan_data = dict(serializer.data)
    plan_data["active_orgs"] = _active_orgs_for_plan(plan.plan_name)
    plan_data["badge"] = _badge_for(plan)
    plan_data["icon"] = _icon_for(plan, all_active_plans)

    return Response({"success": True, "data": plan_data}, status=status.HTTP_200_OK)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_plan(request, id):

    if request.user.role != "SUPER_ADMIN":
        return Response(
            {"success": False, "message": "Only Super Admin can update plans."},
            status=status.HTTP_403_FORBIDDEN,
        )

    plan = get_object_or_404(
        Plan,
        id=id,
    )

    serializer = PlanSerializer(
        plan,
        data=request.data,
        partial=True,
    )

    if serializer.is_valid():

        updated_plan = serializer.save(updated_by=request.user.username)

        if updated_plan.is_popular:
            _unset_other_popular_plans(current_plan_id=updated_plan.id)

        log_action(request.user, "Update", "Plans")

        return Response(
            {
                "success": True,
                "message": "Plan updated successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        {"success": False, "errors": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )