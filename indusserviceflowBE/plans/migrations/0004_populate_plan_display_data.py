"""
One-time data migration to populate the new fields (trial_days,
is_popular, features) on your 4 existing plans, so the Plans page
looks correct again without manually editing each one through the
Create/Edit form.

HOW TO USE:
1. Save this file as a new migration in plans/migrations/, e.g.:
     plans/migrations/0003_populate_plan_display_data.py
   (adjust the migration number to come right after your
   makemigrations output, and check `dependencies` below points to
   the migration that actually added trial_days/is_popular/features)
2. Run: python manage.py migrate

If your plan_name values in the database don't exactly match the
keys below ("Free Trial", "Starter", "Growth", "Enterprise"), edit
PLAN_DATA to match your real values first.
"""

from django.db import migrations


PLAN_DATA = {
    "Free Trial": {
        "trial_days": 14,
        "is_popular": False,
        "features": [
            {"label": "Basic reports & history", "included": True},
            {"label": "Email support", "included": True},
            {"label": "Multiple branches / locations", "included": False},
            {"label": "Custom staff roles & permissions", "included": False},
            {"label": "Priority email & chat support", "included": False},
            {"label": "24/7 priority support", "included": False},
            {"label": "Dedicated account manager", "included": False},
        ],
    },
    "Starter": {
        "trial_days": None,
        "is_popular": False,
        "features": [
            {"label": "Basic reports & history", "included": True},
            {"label": "Email support", "included": True},
            {"label": "Multiple branches / locations", "included": False},
            {"label": "Custom staff roles & permissions", "included": False},
            {"label": "Priority email & chat support", "included": False},
            {"label": "24/7 priority support", "included": False},
            {"label": "Dedicated account manager", "included": False},
        ],
    },
    "Growth": {
        "trial_days": None,
        "is_popular": True,
        "features": [
            {"label": "Detailed reports & data export", "included": True},
            {"label": "Priority email & chat support", "included": True},
            {"label": "Multiple branches / locations", "included": True},
            {"label": "Custom staff roles & permissions", "included": True},
            {"label": "Basic reports & history", "included": False},
            {"label": "24/7 priority support", "included": False},
            {"label": "Dedicated account manager", "included": False},
        ],
    },
    "Enterprise": {
        "trial_days": None,
        "is_popular": False,
        "features": [
            {"label": "Detailed reports & data export", "included": True},
            {"label": "24/7 priority support", "included": True},
            {"label": "Multiple branches / locations", "included": True},
            {"label": "Custom staff roles & permissions", "included": True},
            {"label": "Dedicated account manager", "included": True},
            {"label": "Basic reports & history", "included": False},
            {"label": "Priority email & chat support", "included": False},
        ],
    },
}


def populate_plan_display_data(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")

    for plan_name, values in PLAN_DATA.items():
        updated = Plan.objects.filter(plan_name__iexact=plan_name).update(
            trial_days=values["trial_days"],
            is_popular=values["is_popular"],
            features=values["features"],
        )
        if updated == 0:
            print(f'WARNING: no Plan found matching plan_name="{plan_name}" — check spelling/casing in your database.')


def reverse_populate_plan_display_data(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")
    Plan.objects.filter(plan_name__in=PLAN_DATA.keys()).update(
        trial_days=None,
        is_popular=False,
        features=[],
    )


class Migration(migrations.Migration):

    # This must match your real migration that added trial_days /
    # is_popular / features — confirmed from `dir plans\migrations`.
    dependencies = [
        ("plans", "0003_alter_plan_options_plan_features_plan_is_popular_and_more"),
    ]

    operations = [
        migrations.RunPython(
            populate_plan_display_data,
            reverse_populate_plan_display_data,
        ),
    ]