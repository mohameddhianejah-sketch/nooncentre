from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0011_servicecategory_duration_minutes'),
    ]

    operations = [
        migrations.CreateModel(
            name='GalleryItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(blank=True, upload_to='gallery/')),
                ('image_url', models.CharField(blank=True, help_text='Optional fallback URL or local frontend asset', max_length=500)),
                ('title_fr', models.CharField(blank=True, max_length=150)),
                ('title_ar', models.CharField(blank=True, max_length=150)),
                ('description_fr', models.TextField(blank=True)),
                ('description_ar', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('order', models.PositiveIntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Gallery photo',
                'verbose_name_plural': 'Gallery photos',
                'ordering': ['order', 'id'],
            },
        ),
    ]