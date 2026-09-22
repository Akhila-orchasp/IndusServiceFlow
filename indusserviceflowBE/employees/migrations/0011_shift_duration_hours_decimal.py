from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0010_shift_org"),
    ]

    operations = [
        migrations.AlterField(
            model_name="shift",
            name="duration_hours",
            field=models.DecimalField(
                max_digits=4,
                decimal_places=1,
                default=8,
                db_column="DurationHours",
            ),
        ),
    ]
