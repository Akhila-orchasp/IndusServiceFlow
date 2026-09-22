from decimal import Decimal

from django.core.management.base import BaseCommand

from subscriptions.models import Subscription


class Command(BaseCommand):
    help = (
        "Recompute monthly_revenue for every subscription using the same "
        "rule as approve_organization (organizations/views.py): "
        "Monthly -> amount, Annual -> amount / 12, Free Trial -> 0. "
        "Reports and fixes any subscription where the stored value doesn't "
        "match."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would change without saving.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING(
                "DRY RUN - no changes will be saved.\n"
            ))

        fixed_count = 0

        for sub in Subscription.objects.select_related("organization").all():
            if sub.billing_cycle == "Monthly":
                correct = sub.amount
            elif sub.billing_cycle == "Annual":
                correct = sub.amount / Decimal("12")
            else:  
                correct = Decimal("0")

           
            correct = correct.quantize(Decimal("0.01"))

            if sub.monthly_revenue != correct:
                self.stdout.write(
                    f"[FIX] id={sub.id} {sub.organization.organization_name} "
                    f"({sub.billing_cycle}) monthly_revenue "
                    f"{sub.monthly_revenue} -> {correct}"
                )
                if not dry_run:
                    sub.monthly_revenue = correct
                    sub.save(update_fields=["monthly_revenue"])
                fixed_count += 1

        self.stdout.write("")
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"Dry run complete. {fixed_count} subscription(s) would be "
                f"fixed."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Done. Fixed {fixed_count} subscription(s)."
            ))