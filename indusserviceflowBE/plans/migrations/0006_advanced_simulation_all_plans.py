from django.db import migrations


TARGET_LABEL = "Advanced Simulation"


def enable_advanced_simulation_for_all(apps, schema_editor):
    Plan = apps.get_model("plans", "Plan")

    for plan in Plan.objects.all():
        features = plan.features or []
        found = False

        for feature in features:
            if feature.get("label") == TARGET_LABEL:
                feature["included"] = True
                found = True

        if not found:
            features.append({"label": TARGET_LABEL, "included": True})

        plan.features = features
        plan.save(update_fields=["features"])


def reverse_advanced_simulation_for_all(apps, schema_editor):
    # No safe reverse: we don't know which plans originally excluded
    # "Advanced Simulation" vs. never having it, so reversing is a no-op.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("plans", "0005_seed_plan_catalog"),
    ]

    operations = [
        migrations.RunPython(
            enable_advanced_simulation_for_all,
            reverse_advanced_simulation_for_all,
        ),
    ]