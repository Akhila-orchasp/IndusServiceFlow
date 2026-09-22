"""
One-time cleanup command.

Before the delete_organization view was changed to a hard delete, deleting
an organization only set is_deleted=True on it — the row (and every User
row pointing to it) stayed in the database.

This command finds all Organization rows that were soft-deleted that way
and actually deletes them now. Because User.organization has
on_delete=models.CASCADE, deleting each organization automatically deletes
every User (org admin) still linked to it as well.

Usage:
    # See what would be deleted, without touching the database
    python manage.py purge_deleted_organizations --dry-run

    # Actually delete them
    python manage.py purge_deleted_organizations
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from organizations.models import Organization


class Command(BaseCommand):
    help = (
        "Hard-deletes organizations that were previously soft-deleted "
        "(is_deleted=True), along with any users still linked to them."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List what would be deleted without actually deleting anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        orgs = Organization.objects.filter(is_deleted=True)
        count = orgs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("No soft-deleted organizations found. Nothing to do."))
            return

        self.stdout.write(f"Found {count} soft-deleted organization(s):")
        for org in orgs:
            linked_users = org.users.all()
            self.stdout.write(
                f"  - [{org.id}] {org.organization_name} "
                f"({linked_users.count()} linked user(s): "
                f"{', '.join(u.username for u in linked_users) or 'none'})"
            )

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDry run only — nothing was deleted."))
            return

        with transaction.atomic():
            deleted_count, details = orgs.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDeleted {count} organization(s) and their linked users. "
                f"Total rows removed: {deleted_count}."
            )
        )
        self.stdout.write(str(details))