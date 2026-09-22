import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('categories', '0002_alter_category_options_alter_category_table'),
        ('services', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicetype',
            name='category',
            field=models.ForeignKey(
                blank=True,
                db_column='CategoryId',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='default_service_types',
                to='categories.category',
            ),
        ),
        migrations.AddConstraint(
            model_name='servicetype',
            constraint=models.UniqueConstraint(
                fields=('category', 'service_type_name'),
                name='unique_service_type_per_category',
            ),
        ),
    ]