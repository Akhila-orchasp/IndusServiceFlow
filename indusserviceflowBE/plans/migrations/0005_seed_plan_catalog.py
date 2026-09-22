from django.db import migrations


FEATURE_CATALOG = [
    "Appointment Booking",
    "Queue Management",
    "Employee Management",
    "Basic Dashboard",
    "Basic Simulation",
    "Basic Reports",
    "Advanced Simulation",
    "Advanced Analytics",
    "Excel Reports",
    "Queue Bottleneck Analysis",
    "Staffing Analysis",
    "Capacity Planning",
    "Unlimited Usage",
]

INCLUDED_BY_PLAN = {
    "Free Trial": {
        "Appointment Booking",
        "Queue Management",
        "Employee Management",
        "Basic Dashboard",
        "Basic Simulation",
        "Basic Reports",
    },
    "Starter": {
        "Appointment Booking",
        "Queue Management",
        "Employee Management",
        "Basic Dashboard",
        "Basic Simulation",
        "Basic Reports",
    },
    "Growth": {
        # Everything in Starter...
        "Appointment Booking",
        "Queue Management",
        "Employee Management",
        "Basic Dashboard",
        "Basic Simulation",
        "Basic Reports",
        # ...plus Growth-only features
        "Advanced Simulation",
        "Advanced Analytics",
        "Excel Reports",
        "Queue Bottleneck Analysis",
        "Staffing Analysis",
    },
    "Enterprise": set(FEATURE_CATALOG),  # everything
}

PLAN_DATA = {
    "Free Trial": {
        "monthly_price": 0,
        "annual_price": 0,
        "description": "Basic features for trying IndusServiceFlow.",
        "trial_days": 14,
        "is_popular": False,
        "employee_limit": 5,
        "queue_limit": 2,
    },
    "Starter": {
        "monthly_price": 2999,
        "annual_price": 2499,
        "description": "Essential queue management for small organizations.",
        "trial_days": None,
        "is_popular": False,
        "employee_limit": 15,
        "queue_limit": 5,
    },
    "Growth": {
        "monthly_price": 5999,
        "annual_price": 4999,
        "description": "Advanced queue management and analytics for growing organizations.",
        "trial_days": None,
        "is_popular": True,
        "employee_limit": 50,
        "queue_limit": 20,
    },
    "Enterprise": {
        "monthly_price": 9999,
        "annual_price": 8333,
        "description": "Complete solution for large organizations.",
        "trial_days": None,
        "is_popular": False,
        "employee_limit": None,
        "queue_limit": None,
    },
}


def _features_for(plan_name):
    included = INCLUDED_BY_PLAN[plan_name]
    return [
        {"label": label, "included": label in included}
        for label in FEATURE_CATALOG
    ]


def seed_plan_catalog(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")

    Plan.objects.filter(is_popular=True).update(is_popular=False)

    for plan_name, values in PLAN_DATA.items():
        Plan.objects.update_or_create(
            plan_name=plan_name,
            defaults={
                "monthly_price": values["monthly_price"],
                "annual_price": values["annual_price"],
                "description": values["description"],
                "trial_days": values["trial_days"],
                "is_popular": values["is_popular"],
                "employee_limit": values["employee_limit"],
                "queue_limit": values["queue_limit"],
                "features": _features_for(plan_name),
                "status": "Active",
                "created_by": "system_seed",
            },
        )


def reverse_seed_plan_catalog(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0004_populate_plan_display_data"),
    ]

    operations = [
        migrations.RunPython(
            seed_plan_catalog,
            reverse_seed_plan_catalog,
        ),
    ]