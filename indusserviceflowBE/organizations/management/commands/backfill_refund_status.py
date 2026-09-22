from django.core.management.base import BaseCommand

from organizations.models import Organization
from subscriptions.models import Subscription


class Command(BaseCommand):
    help = "Backfill Subscription.payment_status='Refunded' and status='Cancelled' for already-rejected, already-paid organizations."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would change without saving anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        rejected_orgs = Organization.objects.filter(
            status="Rejected",
            is_deleted=False,
        )

        updated = 0
        skipped_no_subscription = 0

        for organization in rejected_orgs:

            subscription = (
                Subscription.objects.filter(organization=organization)
                .order_by("-id")
                .first()
            )

            if not subscription:
                skipped_no_subscription += 1
                continue

            already_refunded = subscription.payment_status != "Paid"
            already_cancelled = subscription.status == "Cancelled"

            if already_refunded and already_cancelled:
                # Fully backfilled already — nothing to do.
                continue

            # Only mark as Refunded when the subscription was actually
            # Paid — orgs that never paid ("Pending"/"Failed") have
            # nothing to refund, matching reject_organization()'s logic.
            needs_refund = subscription.payment_status == "Paid"

            self.stdout.write(
                f"{'[DRY RUN] Would update' if dry_run else 'Updating'}: "
                f"{organization.organization_name} "
                f"(subscription #{subscription.id}) "
                + (
                    f"payment_status: {subscription.payment_status} -> Refunded, "
                    if needs_refund
                    else ""
                )
                + f"status: {subscription.status} -> Cancelled"
            )

            if not dry_run:
                if needs_refund:
                    subscription.payment_status = "Refunded"
                subscription.status = "Cancelled"
                subscription.updated_by = "System (backfill)"
                subscription.save(update_fields=["payment_status", "status", "updated_by", "updated_on"])

            updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"\n{'Would update' if dry_run else 'Updated'} {updated} subscription(s)."
        ))

        if skipped_no_subscription:
            self.stdout.write(self.style.WARNING(
                f"Skipped {skipped_no_subscription} rejected organization(s) with no subscription row at all."
            ))