from django.core.management.base import BaseCommand

from organizations.models import Organization
from subscriptions.models import Subscription


class Command(BaseCommand):
    help = "Backfill Subscription.payment_status='Paid' for already-active organizations."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would change without saving anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        active_orgs = Organization.objects.filter(
            status="Active",
            is_deleted=False,
        )

        updated = 0
        skipped_no_subscription = 0

        for organization in active_orgs:

            subscription = (
                Subscription.objects.filter(organization=organization)
                .order_by("-id")
                .first()
            )

            if not subscription:
                skipped_no_subscription += 1
                continue

            if subscription.payment_status == "Paid":
                continue

            self.stdout.write(
                f"{'[DRY RUN] Would update' if dry_run else 'Updating'}: "
                f"{organization.organization_name} "
                f"(subscription #{subscription.id}) "
                f"payment_status: {subscription.payment_status} -> Paid"
            )

            if not dry_run:
                subscription.payment_status = "Paid"
                subscription.updated_by = "System (backfill)"
                subscription.save(update_fields=["payment_status", "updated_by", "updated_on"])

            updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"\n{'Would update' if dry_run else 'Updated'} {updated} subscription(s)."
        ))

        if skipped_no_subscription:
            self.stdout.write(self.style.WARNING(
                f"Skipped {skipped_no_subscription} active organization(s) with no subscription row at all."
            ))