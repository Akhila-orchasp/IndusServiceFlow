from django.db import migrations


def grandfather_existing_employees(apps, schema_editor):
    Employee = apps.get_model("employees", "Employee")
    Employee.objects.all().update(must_change_password=False)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0003_employee_must_change_password"),
    ]

    operations = [
        migrations.RunPython(
            grandfather_existing_employees,
            reverse_code=noop_reverse,
        ),
    ]