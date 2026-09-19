from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('core', '0012_galleryitem')]

    operations = [
        migrations.AddField(
            model_name='clientaccount',
            name='avatar',
            field=models.ImageField(blank=True, upload_to='clients/'),
        ),
        migrations.AddField(
            model_name='testimonial',
            name='client',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='testimonials', to='core.clientaccount'),
        ),
    ]