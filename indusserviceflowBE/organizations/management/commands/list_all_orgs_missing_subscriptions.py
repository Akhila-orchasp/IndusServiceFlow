from django.core.management.base import BaseCommand

from organizations.models import Organization
from subscriptions.models import Subscription


class Command(BaseCommand):
    help = "List every organization (any status) that has no Subscription row, grouped by status."

    def handle(self, *args, **options):

        orgs_with_subscription_ids = set(
            Subscription.objects.values_list("organization_id", flat=True)
        )

        missing = Organization.objects.filter(
            is_deleted=False,
        ).exclude(
            id__in=orgs_with_subscription_ids
        ).order_by("status", "organization_name")

        if not missing.exists():
            self.stdout.write(self.style.SUCCESS("Every organization has a subscription row."))
            return

        by_status = {}

        for org in missing:
            by_status.setdefault(org.status, []).append(org)

        self.stdout.write(self.style.WARNING(f"{missing.count()} organization(s) with no subscription, across all statuses:\n"))

        for org_status, orgs in by_status.items():
            self.stdout.write(f"{org_status} ({len(orgs)}):")

            for org in orgs:
                self.stdout.write(f"  id={org.id:<5} {org.organization_name}")

            self.stdout.write("")

        self.stdout.write(
            "Note: only Active orgs missing a subscription need action — see\n"
            "list_orgs_missing_subscriptions + backfill_missing_subscriptions for those.\n"
            "Pending/Rejected orgs without a subscription are normal (they never\n"
            "reached or completed the payment step)."
        )