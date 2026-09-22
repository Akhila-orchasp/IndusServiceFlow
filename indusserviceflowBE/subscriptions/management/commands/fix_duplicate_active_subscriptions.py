from django.core.management.base import BaseCommand
from django.db.models import Count

from subscriptions.models import Subscription


class Command(BaseCommand):
    help = (
        "An organization should only ever have ONE Subscription row with "
        "status='Active' at a time (every plan upgrade/renewal path is "
        "supposed to move the previous Active row to 'Expired' when a new "
        "one goes live). Some existing data has more than one Active row "
        "per organization — e.g. left over from an update_subscription edit "
        "that set a row back to 'Active' without expiring the org's other "
        "Active row. That inflates KPIs like 'Active organizations' beyond "
        "the true number of organizations. This command finds every "
        "organization with more than one Active subscription and expires "
        "all but the most recently created one."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would change without saving anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING(
                "DRY RUN - no changes will be saved.\n"
            ))

        duplicate_org_ids = (
            Subscription.objects.filter(status="Active")
            .values("organization_id")
            .annotate(active_count=Count("id"))
            .filter(active_count__gt=1)
            .values_list("organization_id", flat=True)
        )

        fixed_orgs = 0
        expired_rows = 0

        for org_id in duplicate_org_ids:

            active_rows = list(
                Subscription.objects.select_related("organization", "plan")
                .filter(organization_id=org_id, status="Active")
                .order_by("-created_on", "-id")
            )

            keep = active_rows[0]
            to_expire = active_rows[1:]

            self.stdout.write(
                f"[ORG] {keep.organization.organization_name} has "
                f"{len(active_rows)} Active rows — keeping id={keep.id} "
                f"({keep.plan.plan_name}, created {keep.created_on})."
            )

            for sub in to_expire:
                self.stdout.write(
                    f"  [EXPIRE] id={sub.id} ({sub.plan.plan_name}, "
                    f"created {sub.created_on})"
                )
                if not dry_run:
                    sub.status = "Expired"
                    sub.save(update_fields=["status", "updated_on"])
                expired_rows += 1

            fixed_orgs += 1

        self.stdout.write("")
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"Dry run complete. {fixed_orgs} organization(s) / "
                f"{expired_rows} row(s) would be fixed."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Done. Fixed {fixed_orgs} organization(s), "
                f"expired {expired_rows} duplicate Active row(s)."
            ))
