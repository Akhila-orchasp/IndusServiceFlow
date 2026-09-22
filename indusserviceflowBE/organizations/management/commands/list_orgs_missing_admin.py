from django.core.management.base import BaseCommand

from organizations.models import Organization


class Command(BaseCommand):
    help = "List non-deleted organizations that have no linked ORG_ADMIN user."

    def handle(self, *args, **options):

        missing = (
            Organization.objects.filter(is_deleted=False)
            .exclude(users__role="ORG_ADMIN")
            .order_by("organization_name")
        )

        if not missing.exists():
            self.stdout.write(self.style.SUCCESS(
                "Every organization has a linked ORG_ADMIN user. Counts should match."
            ))
            return

        self.stdout.write(self.style.WARNING(
            f"{missing.count()} organization(s) with no ORG_ADMIN user "
            f"(this is the gap between the Organizations and Users counts):\n"
        ))

        for org in missing:
            self.stdout.write(
                f"  id={org.id:<5} status={org.status:<10} {org.organization_name} "
                f"({org.email})"
            )

        self.stdout.write(
            "\nNext step: review the list above, then run\n"
            "  python manage.py backfill_missing_admins --dry-run\n"
            "to create a placeholder ORG_ADMIN for each one (using the org's own "
            "email/mobile as contact details, since there's no separate contact "
            "person on file for orgs created this way).\n"
        )