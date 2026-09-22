import json
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError

from organizations.models import Organization
from subscriptions.models import Subscription
from plans.models import Plan

VALID_BILLING_CYCLES = {"Monthly", "Annual", "Free Trial"}


class Command(BaseCommand):
    help = "Create missing Subscription rows from a JSON org->plan mapping file."

    def add_arguments(self, parser):
        parser.add_argument("mapping_file", type=str)
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without saving anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        mapping_path = options["mapping_file"]

        try:
            with open(mapping_path, "r", encoding="utf-8") as f:
                mapping = json.load(f)
        except FileNotFoundError:
            raise CommandError(f"File not found: {mapping_path}")
        except json.JSONDecodeError as e:
            raise CommandError(f"Invalid JSON in {mapping_path}: {e}")

        created = 0
        errors = []

        for org_name, spec in mapping.items():

            plan_name = spec.get("plan")
            billing_cycle = spec.get("billing_cycle")

            if billing_cycle not in VALID_BILLING_CYCLES:
                errors.append(f"{org_name}: billing_cycle must be one of {VALID_BILLING_CYCLES}, got {billing_cycle!r}")
                continue

            organization = Organization.objects.filter(
                organization_name=org_name,
                is_deleted=False,
            ).first()

            if not organization:
                errors.append(f"{org_name}: no matching organization found (check exact spelling).")
                continue

            if Subscription.objects.filter(organization=organization).exists():
                self.stdout.write(f"Skipping {org_name}: already has a subscription.")
                continue

            plan = Plan.objects.filter(plan_name=plan_name).first()

            if not plan:
                errors.append(f"{org_name}: no plan named {plan_name!r} found.")
                continue

            is_trial = billing_cycle == "Free Trial"

            if is_trial and not plan.trial_days:
                errors.append(f"{org_name}: plan {plan_name!r} has no trial_days set, can't use Free Trial.")
                continue

            amount = (
                0
                if is_trial
                else (plan.monthly_price if billing_cycle == "Monthly" else plan.annual_price)
            )

            monthly_revenue = (
                0
                if is_trial
                else (amount if billing_cycle == "Monthly" else amount / 12)
            )

            next_payment_date = (
                date.today() + timedelta(days=plan.trial_days)
                if is_trial
                else date.today() + timedelta(days=365 if billing_cycle == "Annual" else 30)
            )

            self.stdout.write(
                f"{'[DRY RUN] Would create' if dry_run else 'Creating'}: "
                f"{org_name} -> plan={plan_name}, billing_cycle={billing_cycle}, "
                f"amount=₹{amount}, status=Active, payment_status=Paid"
            )

            if not dry_run:
                Subscription.objects.create(
                    organization=organization,
                    plan=plan,
                    billing_cycle=billing_cycle,
                    monthly_revenue=monthly_revenue,
                    amount=amount,
                    payment_status="Paid",
                    is_free_trial=is_trial,
                    start_date=date.today(),
                    next_payment_date=next_payment_date,
                    status="Active",
                    created_by="System (backfill)",
                )

            created += 1

        self.stdout.write(self.style.SUCCESS(
            f"\n{'Would create' if dry_run else 'Created'} {created} subscription(s)."
        ))

        if errors:
            self.stdout.write(self.style.ERROR(f"\n{len(errors)} entrie(s) skipped due to errors:"))
            for err in errors:
                self.stdout.write(self.style.ERROR(f"  - {err}"))