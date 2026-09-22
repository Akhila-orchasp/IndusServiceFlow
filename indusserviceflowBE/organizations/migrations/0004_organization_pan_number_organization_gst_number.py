from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0003_alter_organization_mobile_alter_organization_pincode"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="pan_number",
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name="organization",
            name="gst_number",
            field=models.CharField(blank=True, max_length=15, null=True),
        ),
    ]