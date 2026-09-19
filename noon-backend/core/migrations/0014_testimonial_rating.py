from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('core', '0013_testimonial_client_clientaccount_avatar')]

    operations = [
        migrations.AddField(
            model_name='testimonial',
            name='rating',
            field=models.PositiveSmallIntegerField(default=5),
        ),
    ]