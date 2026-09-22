from datetime import date

from django.core.management.base import BaseCommand, CommandError

from organizations.models import Organization
from plans.models import Plan
from subscriptions.models import Subscription


class Command(BaseCommand):
    help = (
        "Create a single Subscription row for one organization with an explicit "
        "plan/billing_cycle/payment_status/status. For one-off historical records "
        "that don't fit the normal registration or backfill flows — e.g. an org "
        "that paid, then was rejected, and needs payment_status='Refunded' on record."
    )

    def add_arguments(self, parser):
        parser.add_argument("--org", required=True, help="Exact organization_name to match.")
        parser.add_argument("--plan", required=True, help="Exact Plan.plan_name to attach.")
        parser.add_argument(
            "--billing-cycle",
            required=True,
            choices=[c[0] for c in Subscription.BILLING_CYCLE_CHOICES],
        )
        parser.add_argument(
            "--payment-status",
            required=True,
            choices=[c[0] for c in Subscription.PAYMENT_STATUS_CHOICES],
        )
        parser.add_argument(
            "--status",
            required=True,
            choices=[c[0] for c in Subscription.STATUS_CHOICES],
            help="Subscription lifecycle status (e.g. Cancelled for a rejected org).",
        )
        parser.add_argument(
            "--amount",
            type=float,
            default=0,
            help="Amount actually paid, if any. Defaults to 0.",
        )
        parser.add_argument(
            "--created-by",
            default="System (manual)",
            help="Recorded as created_by/updated_by. Defaults to 'System (manual)'.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Create even if this organization already has a subscription row.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without saving anything.",
        )

    def handle(self, *args, **options):
        org_name = options["org"]
        plan_name = options["plan"]
        dry_run = options["dry_run"]

        try:
            organization = Organization.objects.get(
                organization_name=org_name, is_deleted=False
            )
        except Organization.DoesNotExist:
            raise CommandError(f"No organization found with organization_name={org_name!r}.")
        except Organization.MultipleObjectsReturned:
            raise CommandError(
                f"Multiple organizations match organization_name={org_name!r}; "
                "use the exact name or resolve the duplicate first."
            )

        try:
            plan = Plan.objects.get(plan_name=plan_name)
        except Plan.DoesNotExist:
            raise CommandError(f"No plan found with plan_name={plan_name!r}.")

        existing = Subscription.objects.filter(organization=organization)
        if existing.exists() and not options["force"]:
            raise CommandError(
                f"{organization.organization_name} already has "
                f"{existing.count()} subscription row(s). Re-run with --force "
                "if you really want to add another one."
            )

        billing_cycle = options["billing_cycle"]
        payment_status = options["payment_status"]
        status = options["status"]
        amount = options["amount"]
        created_by = options["created_by"]

        self.stdout.write(
            f"{'[DRY RUN] Would create' if dry_run else 'Creating'} subscription for "
            f"{organization.organization_name!r}: plan={plan.plan_name}, "
            f"billing_cycle={billing_cycle}, payment_status={payment_status}, "
            f"status={status}, amount={amount}"
        )

        if dry_run:
            return

        subscription = Subscription.objects.create(
            organization=organization,
            plan=plan,
            billing_cycle=billing_cycle,
            amount=amount,
            payment_status=payment_status,
            is_free_trial=(billing_cycle == "Free Trial"),
            start_date=date.today(),
            status=status,
            created_by=created_by,
            updated_by=created_by,
        )

        self.stdout.write(self.style.SUCCESS(
            f"Created subscription #{subscription.id} for {organization.organization_name}."
        ))