from django.core.management.base import BaseCommand, CommandError

from categories.models import Category
from organizations.models import Organization

ORG_DATA = [
    {
        "organization_name": "NIMS Hospital",
        "category": "Hospitals",
        "email": "contact@nimshospital.com",
        "mobile": "9911002233",
        "address": "Punjagutta, Road No 1",
        "city": "Hyderabad",
        "state": "Telangana",
        "pincode": "500082",
    },
    {
        "organization_name": "Omini Multi Speciality Hospitals",
        "category": "Hospitals",
        "email": "contact@ominihospitals.com",
        "mobile": "9922113344",
        "address": "Kondapur Main Road",
        "city": "Hyderabad",
        "state": "Telangana",
        "pincode": "500084",
    },
    {
        "organization_name": "Saanvi Hospitals",
        "category": "Hospitals",
        "email": "contact@saanvihospitals.com",
        "mobile": "9933224455",
        "address": "Ameerpet Main Road",
        "city": "Hyderabad",
        "state": "Telangana",
        "pincode": "500016",
    },
    {
        "organization_name": "Telecaller",
        "category": "Customer Support",
        "email": "contact@telecaller.com",
        "mobile": "9963287415",
        "address": "Madhapur",
        "city": "Hyderabad",
        "state": "Telangana",
        "pincode": "500081",
    },
]


class Command(BaseCommand):
    help = "Create organizations from ORG_DATA that are missing from the DB."

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

        created_count = 0
        skipped = []

        for info in ORG_DATA:
            name = info["organization_name"]

            if Organization.objects.filter(organization_name__iexact=name).exists():
                skipped.append(f"'{name}': already exists, skipping.")
                continue

            category = Category.objects.filter(
                category_name__iexact=info["category"]
            ).first()

            if category is None:
                skipped.append(
                    f"'{name}': no Category named '{info['category']}' found. "
                    f"Create that category first, or edit ORG_DATA to use an "
                    f"existing category name. Available categories: "
                    + ", ".join(Category.objects.values_list(
                        "category_name", flat=True
                    ))
                )
                continue

            # email and mobile are unique fields - check ahead of time so a
            # collision shows up as a clean skip instead of crashing the
            # whole command partway through.
            if Organization.objects.filter(email__iexact=info["email"]).exists():
                skipped.append(
                    f"'{name}': email '{info['email']}' is already used by "
                    f"another organization. Change it in ORG_DATA."
                )
                continue

            if Organization.objects.filter(mobile=info["mobile"]).exists():
                skipped.append(
                    f"'{name}': mobile '{info['mobile']}' is already used by "
                    f"another organization. Change it in ORG_DATA."
                )
                continue

            self.stdout.write(f"[CREATE] {name} -> category='{category.category_name}'")

            if dry_run:
                continue

            Organization.objects.create(
                organization_name=name,
                category=category,
                email=info["email"],
                mobile=info["mobile"],
                address=info["address"],
                city=info["city"],
                state=info["state"],
                pincode=info["pincode"],
                status="Active",
                created_by="restore_script",
            )
            created_count += 1

        self.stdout.write("")
        if dry_run:
            self.stdout.write(self.style.WARNING(
                "Dry run complete - nothing was saved."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Done. Created {created_count} organization(s)."
            ))

        if skipped:
            self.stdout.write("")
            self.stdout.write(self.style.ERROR(
                f"{len(skipped)} entr{'y was' if len(skipped) == 1 else 'ies were'} "
                f"skipped:"
            ))
            for line in skipped:
                self.stdout.write(f"  - {line}")