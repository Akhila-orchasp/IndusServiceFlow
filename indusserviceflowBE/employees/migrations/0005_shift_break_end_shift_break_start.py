from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0004_grandfather_existing_employees_password'),
    ]

    operations = [
        migrations.AddField(
            model_name='shift',
            name='break_end',
            field=models.TimeField(blank=True, db_column='BreakEnd', null=True),
        ),
        migrations.AddField(
            model_name='shift',
            name='break_start',
            field=models.TimeField(blank=True, db_column='BreakStart', null=True),
        ),
    ]
