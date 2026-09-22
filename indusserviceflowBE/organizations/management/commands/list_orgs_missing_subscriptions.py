"""
Lists every active organization that has no Subscription row at all,
alongside the list of available plans, so you can decide what to assign
each one before running backfill_missing_subscriptions.

Usage:
    python manage.py list_orgs_missing_subscriptions
"""

from django.core.management.base import BaseCommand

from organizations.models import Organization
from subscriptions.models import Subscription
from plans.models import Plan


class Command(BaseCommand):
    help = "List active organizations that have no Subscription row."

    def handle(self, *args, **options):

        orgs_with_subscription_ids = set(
            Subscription.objects.values_list("organization_id", flat=True)
        )

        missing = Organization.objects.filter(
            status="Active",
            is_deleted=False,
        ).exclude(
            id__in=orgs_with_subscription_ids
        ).order_by("organization_name")

        if not missing.exists():
            self.stdout.write(self.style.SUCCESS("No active organizations are missing a subscription."))
            return

        self.stdout.write(self.style.WARNING(f"{missing.count()} active organization(s) with no subscription:\n"))

        for org in missing:
            self.stdout.write(f"  id={org.id:<5} {org.organization_name}")

        self.stdout.write("\nAvailable plans:\n")

        for plan in Plan.objects.filter(status="Active").order_by("monthly_price"):
            self.stdout.write(
                f"  {plan.plan_name!r:<20} monthly=₹{plan.monthly_price}  "
                f"annual=₹{plan.annual_price}  trial_days={plan.trial_days}"
            )

        self.stdout.write(
            "\nNext step: fill these into a JSON file like:\n"
            '  {\n'
            '    "Org Name Exactly As Above": {"plan": "Starter", "billing_cycle": "Monthly"},\n'
            '    "Another Org": {"plan": "Pro", "billing_cycle": "Annual"}\n'
            '  }\n'
            "billing_cycle must be one of: Monthly, Annual, Free Trial\n"
            "Then run:\n"
            "  python manage.py backfill_missing_subscriptions path\\to\\file.json --dry-run\n"
        )