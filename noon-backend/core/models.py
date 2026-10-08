import datetime

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone


class ServiceCategory(models.Model):
    """e.g. Visage, Corps, Épilation, Mains & pieds"""
    name_fr = models.CharField(max_length=100)
    name_ar = models.CharField(max_length=100)
    description_fr = models.CharField(max_length=255, blank=True)
    description_ar = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(unique=True, help_text="Used as the filter key, e.g. 'visage'")
    order = models.PositiveIntegerField(default=0)
    capacity = models.PositiveIntegerField(default=1,
                                           help_text="Max people bookable per time slot for this category")
    duration_minutes = models.PositiveIntegerField(
        default=60,
        help_text="Typical duration of one appointment in this category, in minutes "
                  "(used to chain consecutive bookings)"
    )

    class Meta:
        ordering = ['order', 'id']
        verbose_name_plural = 'Service categories'

    def __str__(self):
        return self.name_fr


class Service(models.Model):
    category = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE, related_name='services')
    name_fr = models.CharField(max_length=150)
    name_ar = models.CharField(max_length=150)
    description_fr = models.CharField(max_length=255, blank=True)
    description_ar = models.CharField(max_length=255, blank=True)
    price_tnd = models.DecimalField(max_digits=7, decimal_places=2)
    is_package = models.BooleanField(default=False, help_text="Highlight as a featured package/forfait")
    old_price_tnd = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True,
                                         help_text="Optional strike-through price, used for packages/promos")
    price_is_from = models.BooleanField(default=False, help_text="Show the price as « à partir de »")
    duration_minutes = models.PositiveIntegerField(default=30, help_text="Duration of the service, in minutes")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['category__order', 'order', 'id']

    def __str__(self):
        return f"{self.name_fr} — {self.price_tnd} TND"


class Testimonial(models.Model):
    client = models.ForeignKey('ClientAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='testimonials')
    author_fr = models.CharField(max_length=100, default='Cliente NOON Center')
    author_ar = models.CharField(max_length=100, default='زبونة مركز NOON')
    text_fr = models.TextField(blank=True)
    text_ar = models.TextField(blank=True)
    rating = models.PositiveSmallIntegerField(default=5)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.text_fr[:50]


class GalleryItem(models.Model):
    image = models.ImageField(upload_to='gallery/', blank=True)
    image_url = models.CharField(max_length=500, blank=True, help_text='Optional fallback URL or local frontend asset')
    title_fr = models.CharField(max_length=150, blank=True)
    title_ar = models.CharField(max_length=150, blank=True)
    description_fr = models.TextField(blank=True)
    description_ar = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Gallery photo'
        verbose_name_plural = 'Gallery photos'

    def __str__(self):
        return self.title_fr or f'Gallery photo {self.pk}'


DAY_CHOICES = [
    (0, 'Lundi / الاثنين'),
    (1, 'Mardi / الثلاثاء'),
    (2, 'Mercredi / الأربعاء'),
    (3, 'Jeudi / الخميس'),
    (4, 'Vendredi / الجمعة'),
    (5, 'Samedi / السبت'),
    (6, 'Dimanche / الأحد'),
]


class OpeningHour(models.Model):
    weekday = models.IntegerField(choices=DAY_CHOICES, unique=True)
    is_closed = models.BooleanField(default=False)
    open_time = models.TimeField(null=True, blank=True)
    close_time = models.TimeField(null=True, blank=True)

    class Meta:
        ordering = ['weekday']

    def __str__(self):
        return dict(DAY_CHOICES)[self.weekday]


class SiteSettings(models.Model):
    """Singleton-style model — only one row is expected, managed via admin."""
    site_name = models.CharField(max_length=100, default='NOON Center')
    tagline_fr = models.CharField(max_length=200, default="Votre moment de beauté et de sérénité")
    tagline_ar = models.CharField(max_length=200, default="لحظتك الخاصة من الجمال والهدوء")
    about_fr = models.TextField(default="")
    about_ar = models.TextField(default="")
    founder_name = models.CharField(max_length=100, default='Saloua Nejah')
    founder_photo = models.ImageField(upload_to='founder/', blank=True, null=True, help_text='Photo optionnelle de la fondatrice pour la carte "Notre histoire".')
    founded_year = models.PositiveIntegerField(default=2015)
    address_fr = models.CharField(max_length=255, default='Rue Ahmed Amine, Boumhel El Bassatine, Ben Arous — en face de la BIAT')
    address_ar = models.CharField(max_length=255, default='نهج أحمد أمين، بومهل البساتين، بن عروس — مقابل بنك BIAT')
    phone = models.CharField(max_length=30, default='+21629909099')
    whatsapp = models.CharField(max_length=30, default='+21629909099')
    facebook_url = models.URLField(default='https://www.facebook.com/nooncenter2016/')
    map_query = models.CharField(max_length=255, default='Boumhel El Bassatine, Ben Arous, Tunisia')
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True, default=None,
        help_text="Business coordinates (WGS84), e.g. 36.7248. Used for the interactive map card."
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, blank=True, null=True, default=None,
        help_text="Business coordinates (WGS84), e.g. 10.2920. Used for the interactive map card."
    )

    class Meta:
        verbose_name = 'Site settings'
        verbose_name_plural = 'Site settings'

    def __str__(self):
        return self.site_name

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class ClientAccount(models.Model):
    """Client account created from the booking form — name + phone, optional birthday."""
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=30, unique=True)
    password_hash = models.CharField(max_length=128, blank=True, default='')
    session_version = models.PositiveIntegerField(default=1)
    birthday = models.DateField(null=True, blank=True, help_text="Optionnel")
    avatar = models.ImageField(upload_to='clients/', blank=True)
    is_admin = models.BooleanField(
        default=False,
        help_text="Promu(e) admin depuis le tableau de bord. Seul le super admin peut modifier ce champ."
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='client_account',
        help_text="Lien vers le compte Django (login email + mot de passe) de ce·tte admin promu·e."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_booking_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Client accounts'

    def __str__(self):
        return f"{self.name} — {self.phone}"

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        return bool(self.password_hash) and check_password(raw_password, self.password_hash)


class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente / قيد الانتظار'),
        ('confirmed', 'Confirmé / مؤكد'),
        ('cancelled', 'Annulé / ملغى'),
        ('done', 'Terminé / منجز'),
    ]

    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=30)
    client = models.ForeignKey(ClientAccount, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name='bookings')
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    service_label = models.CharField(max_length=500, blank=True, help_text="One or more requested services")
    category_slugs = models.CharField(max_length=300, blank=True, default='',
                                       help_text="Comma-separated category slugs for per-category availability")
    category_times = models.JSONField(default=dict, blank=True,
                                       help_text="Preferred time per category slug, e.g. {\"coiffure\": \"10:00\", \"spa\": \"14:00\"}")
    preferred_date = models.DateField(null=True, blank=True)
    preferred_time = models.TimeField(null=True, blank=True)
    message = models.TextField(blank=True)
    language = models.CharField(max_length=2, choices=[('fr', 'Français'), ('ar', 'العربية')], default='fr')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Keep legacy preferred_time in sync with the first category time
        if self.category_times and not self.preferred_time:
            first_time = next((v for v in self.category_times.values() if v), None)
            if first_time:
                from django.utils.dateparse import parse_time
                self.preferred_time = parse_time(first_time)
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} — {self.preferred_date or 'no date'}"


class AdminAuditLog(models.Model):
    """Lightweight activity log for important admin/content actions
    (gallery changes, settings/footer edits, reservation status updates, ...)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                             null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=60, help_text="Machine-readable action name, e.g. 'gallery_uploaded'")
    target_type = models.CharField(max_length=50, blank=True, default='',
                                   help_text="Target model name, e.g. 'gallery', 'booking', 'settings'")
    target_key = models.CharField(max_length=255, blank=True, default='',
                                  help_text="Human readable target reference (id or title)")
    details = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Activity log entry'
        verbose_name_plural = 'Activity log entries'

    def __str__(self):
        return f"{self.action} {self.target_key} ({self.created_at:%Y-%m-%d %H:%M})"
