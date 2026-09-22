from django.core.management.base import BaseCommand, CommandError

from subscriptions.models import Subscription


class Command(BaseCommand):
    help = (
        "Update the status field on one existing Subscription row by id. "
        "For fixing stale records (e.g. a rejected+refunded org whose "
        "subscription never got moved to Cancelled) without creating a "
        "duplicate subscription row."
    )

    def add_arguments(self, parser):
        parser.add_argument("--subscription-id", type=int, required=True)
        parser.add_argument(
            "--status",
            required=True,
            choices=[c[0] for c in Subscription.STATUS_CHOICES],
        )
        parser.add_argument("--updated-by", default="System (manual)")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        sub_id = options["subscription_id"]
        new_status = options["status"]
        dry_run = options["dry_run"]

        try:
            subscription = Subscription.objects.select_related(
                "organization", "plan"
            ).get(id=sub_id)
        except Subscription.DoesNotExist:
            raise CommandError(f"No subscription found with id={sub_id}.")

        old_status = subscription.status

        self.stdout.write(
            f"{'[DRY RUN] Would update' if dry_run else 'Updating'} subscription "
            f"#{subscription.id} ({subscription.organization.organization_name}): "
            f"status {old_status!r} -> {new_status!r}"
        )

        if dry_run:
            return

        subscription.status = new_status
        subscription.updated_by = options["updated_by"]
        subscription.save(update_fields=["status", "updated_by", "updated_on"])

        self.stdout.write(self.style.SUCCESS("Done."))