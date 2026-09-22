from django.core.management.base import BaseCommand
from django.db import transaction

from organizations.models import Organization
from organizations.serializers import generate_username
from users.models import User


class Command(BaseCommand):
    help = "Create a placeholder ORG_ADMIN user for organizations missing one."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would happen without changing the database.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING(
                "DRY RUN - no changes will be saved.\n"
            ))

        missing = (
            Organization.objects.filter(is_deleted=False)
            .exclude(users__role="ORG_ADMIN")
            .order_by("organization_name")
        )

        if not missing.exists():
            self.stdout.write(self.style.SUCCESS(
                "Every organization already has an ORG_ADMIN user. Nothing to do."
            ))
            return

        created_count = 0
        skipped = []

        for org in missing:

            if User.objects.filter(email__iexact=org.email).exists():
                skipped.append(
                    f"'{org.organization_name}': a user already exists with "
                    f"email '{org.email}' (not the org's own admin, but the "
                    f"email is taken) -- create this one manually with a "
                    f"different email."
                )
                continue

            if User.objects.filter(mobile=org.mobile).exists():
                skipped.append(
                    f"'{org.organization_name}': a user already exists with "
                    f"mobile '{org.mobile}' -- create this one manually with "
                    f"a different mobile."
                )
                continue

            admin_name = f"{org.organization_name} Admin"
            status = "Active" if (org.status or "").lower() == "active" else "Pending"

            self.stdout.write(
                f"[CREATE] org='{org.organization_name}' -> admin email="
                f"{org.email} mobile={org.mobile} status={status}"
            )

            if dry_run:
                continue

            with transaction.atomic():
                username = generate_username(admin_name)
                user = User.objects.create(
                    username=username,
                    name=admin_name,
                    email=org.email,
                    mobile=org.mobile,
                    role="ORG_ADMIN",
                    organization=org,
                    status=status,
                    created_by="backfill_missing_admins",
                )
                user.set_unusable_password()
                user.save()

            created_count += 1

        self.stdout.write("")
        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run complete - nothing was saved."))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Done. Created {created_count} admin user(s)."
            ))

        if skipped:
            self.stdout.write("")
            self.stdout.write(self.style.ERROR(
                f"{len(skipped)} entr{'y was' if len(skipped) == 1 else 'ies were'} skipped:"
            ))
            for line in skipped:
                self.stdout.write(f"  - {line}")