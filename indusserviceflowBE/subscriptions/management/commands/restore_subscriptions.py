import difflib
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from organizations.models import Organization
from plans.models import Plan
from subscriptions.models import Subscription

RESTORE_DATA = {
    "Doctor's Clinic": {"plan": "Free Trial", "billing_cycle": "Free Trial"},
    "Indusind bank": {"plan": "Starter", "billing_cycle": "Monthly"},
    "nandhini hospitals": {"plan": "Free Trial", "billing_cycle": "Free Trial"},
    "NIMS Hospital": {"plan": "Growth", "billing_cycle": "Monthly"},
    "Omini Multi Speciality Hospitals": {"plan": "Growth", "billing_cycle": "Monthly"},
    "Saanvi Hospitals": {"plan": "Enterprise", "billing_cycle": "Monthly"},
    "Telecaller": {"plan": "Starter", "billing_cycle": "Monthly"},
    "Yashoda Hospitals": {"plan": "Free Trial", "billing_cycle": "Free Trial"},
}

PLAN_NAME_FALLBACK = {
    "Free Trial": None,
}


class Command(BaseCommand):
    help = "Restore Subscription rows for organizations from RESTORE_DATA."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would happen without changing the database.",
        )
        parser.add_argument(
            "--assign-missing-as-trial",
            action="store_true",
            help=(
                "For organizations that exist in the DB but have no entry in "
                "RESTORE_DATA (e.g. your friend's export didn't include a "
                "plan for them) and no existing Subscription, create a "
                "Free Trial subscription for them instead of leaving them "
                "with none."
            ),
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(
                self.style.WARNING("DRY RUN - no changes will be saved.\n")
            )

        trial_plan_fallback = (
            Plan.objects.filter(status="Active", trial_days__isnull=False)
            .order_by("monthly_price")
            .first()
        )

        created_count = 0
        updated_count = 0
        skipped = []

        all_org_names = list(
            Organization.objects.values_list("organization_name", flat=True)
        )

        for org_name, info in RESTORE_DATA.items():
            plan_name = info["plan"]
            billing_cycle = info["billing_cycle"]

            organization = Organization.objects.filter(
                organization_name__iexact=org_name
            ).first()

            if organization is None:
                candidates = Organization.objects.filter(
                    organization_name__icontains=org_name
                )
                if candidates.count() == 1:
                    organization = candidates.first()
                    self.stdout.write(
                        f"  Note: '{org_name}' matched existing organization "
                        f"'{organization.organization_name}' via partial match."
                    )

            if organization is None:
                close = difflib.get_close_matches(
                    org_name, all_org_names, n=3, cutoff=0.6
                )
                hint = (
                    f" Did you mean: {', '.join(close)}?"
                    if close
                    else " No similar organization names were found either - "
                    "it may not exist in the organizations table at all."
                )
                skipped.append(
                    f"'{org_name}': no Organization found with this name." f"{hint}"
                )
                continue

            plan = Plan.objects.filter(plan_name__iexact=plan_name).first()

            if plan is None and plan_name in PLAN_NAME_FALLBACK:
                plan = trial_plan_fallback
                if plan:
                    self.stdout.write(
                        f"  Note: no Plan literally named '{plan_name}' - "
                        f"using '{plan.plan_name}' (has trial_days set) for "
                        f"'{org_name}' instead."
                    )

            if plan is None:
                skipped.append(
                    f"'{org_name}': no Plan found matching '{plan_name}'. "
                    f"Check the exact plan name in your plans table."
                )
                continue

            is_trial = billing_cycle == "Free Trial"
            amount = (
                0
                if is_trial
                else (
                    plan.monthly_price
                    if billing_cycle == "Monthly"
                    else plan.annual_price
                )
            )

            next_payment_date = date.today() + timedelta(
                days=(
                    (plan.trial_days or 14)
                    if is_trial
                    else (365 if billing_cycle == "Annual" else 30)
                )
            )

            existing = Subscription.objects.filter(organization=organization).first()

            if existing:
                action = "UPDATE"
            else:
                action = "CREATE"

            self.stdout.write(
                f"[{action}] {org_name} -> plan='{plan.plan_name}', "
                f"billing_cycle='{billing_cycle}', amount={amount}"
            )

            if dry_run:
                continue

            if existing:
                existing.plan = plan
                existing.billing_cycle = billing_cycle
                existing.amount = amount
                existing.is_free_trial = is_trial
                existing.payment_status = "Paid"
                existing.status = "Active"
                existing.next_payment_date = next_payment_date
                existing.updated_by = "restore_script"
                existing.save()
                updated_count += 1
            else:
                Subscription.objects.create(
                    organization=organization,
                    plan=plan,
                    billing_cycle=billing_cycle,
                    amount=amount,
                    is_free_trial=is_trial,
                    payment_status="Paid",
                    status="Active",
                    start_date=date.today(),
                    next_payment_date=next_payment_date,
                    created_by="restore_script",
                )
                created_count += 1

        self.stdout.write("")
        if dry_run:
            self.stdout.write(
                self.style.WARNING("Dry run complete for RESTORE_DATA entries.")
            )

        if skipped:
            self.stdout.write("")
            self.stdout.write(
                self.style.ERROR(
                    f"{len(skipped)} entr{'y was' if len(skipped) == 1 else 'ies were'} "
                    f"skipped:"
                )
            )
            for line in skipped:
                self.stdout.write(f"  - {line}")

        restore_names_lower = {name.lower() for name in RESTORE_DATA}
        orgs_without_plan_info = [
            org
            for org in Organization.objects.filter(subscriptions__isnull=True)
            if org.organization_name.lower() not in restore_names_lower
        ]

        if orgs_without_plan_info:
            self.stdout.write("")
            self.stdout.write(
                self.style.WARNING(
                    f"{len(orgs_without_plan_info)} organization(s) exist in "
                    f"the database but have NO plan info in RESTORE_DATA and no "
                    f"existing subscription:"
                )
            )
            for org in orgs_without_plan_info:
                self.stdout.write(f"  - {org.organization_name}")

            if options["assign_missing_as_trial"]:
                if not trial_plan_fallback:
                    self.stdout.write(
                        self.style.ERROR(
                            "  Cannot assign Free Trial - no Active plan with "
                            "trial_days set was found."
                        )
                    )
                else:
                    for org in orgs_without_plan_info:
                        next_payment_date = date.today() + timedelta(
                            days=trial_plan_fallback.trial_days or 14
                        )
                        self.stdout.write(
                            f"[CREATE] {org.organization_name} -> "
                            f"plan='{trial_plan_fallback.plan_name}' "
                            f"(default Free Trial, no data provided)"
                        )
                        if not dry_run:
                            Subscription.objects.create(
                                organization=org,
                                plan=trial_plan_fallback,
                                billing_cycle="Free Trial",
                                amount=0,
                                is_free_trial=True,
                                payment_status="Paid",
                                status="Active",
                                start_date=date.today(),
                                next_payment_date=next_payment_date,
                                created_by="restore_script",
                            )
                            created_count += 1
            else:
                self.stdout.write(
                    "  Re-run with --assign-missing-as-trial to give these "
                    "a default Free Trial subscription instead of leaving "
                    "them with none."
                )

        self.stdout.write("")
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "Dry run complete - nothing was saved. "
                    "Re-run without --dry-run to apply these changes."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Done. Created {created_count}, updated {updated_count} "
                    f"subscription(s) total."
                )
            )
