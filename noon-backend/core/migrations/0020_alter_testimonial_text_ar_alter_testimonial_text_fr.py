from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0019_sitesettings_founder_photo'),
    ]

    operations = [
        migrations.AlterField(
            model_name='testimonial',
            name='text_ar',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='testimonial',
            name='text_fr',
            field=models.TextField(blank=True),
        ),
    ]