from django.core.management.base import BaseCommand, CommandError

from organizations.models import Organization
from subscriptions.models import Subscription


class Command(BaseCommand):
    help = (
        "Read-only: list every Subscription row for one organization, newest "
        "first, so you can see if there's more than one row and which one is "
        "actually Active. Useful when an org shows Active but its subscription "
        "still shows Pending Activation somewhere."
    )

    def add_arguments(self, parser):
        parser.add_argument("--org", required=True, help="Exact organization_name to match.")

    def handle(self, *args, **options):
        org_name = options["org"]

        try:
            organization = Organization.objects.get(
                organization_name=org_name, is_deleted=False
            )
        except Organization.DoesNotExist:
            raise CommandError(f"No organization found with organization_name={org_name!r}.")

        self.stdout.write(
            f"Organization: {organization.organization_name} "
            f"(id={organization.id}, status={organization.status})\n"
        )

        subs = Subscription.objects.filter(organization=organization).order_by("-id")

        if not subs.exists():
            self.stdout.write(self.style.WARNING("No subscription rows found."))
            return

        self.stdout.write(f"{subs.count()} subscription row(s), newest first:\n")

        for sub in subs:
            self.stdout.write(
                f"  id={sub.id:<5} plan={sub.plan.plan_name:<12} "
                f"billing_cycle={sub.billing_cycle:<12} status={sub.status:<20} "
                f"payment_status={sub.payment_status:<10} amount={sub.amount:<10} "
                f"monthly_revenue={sub.monthly_revenue:<10} "
                f"created_on={sub.created_on:%Y-%m-%d %H:%M} "
                f"updated_on={sub.updated_on:%Y-%m-%d %H:%M}"
            )