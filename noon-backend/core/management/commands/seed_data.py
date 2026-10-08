from datetime import time
from django.core.management.base import BaseCommand
from core.models import ServiceCategory, Service, Testimonial, GalleryItem, OpeningHour, SiteSettings


class Command(BaseCommand):
    help = "Seed the database with NOON Center starter content"

    def handle(self, *args, **options):
        obj, _ = SiteSettings.objects.get_or_create(pk=1, defaults=dict(
            about_fr=(
                "Depuis 2015, NOON Center accompagne les femmes de Boumhel El Bassatine et de toute la "
                "région dans leurs moments de détente et de beauté. Fondé par Saloua Nejah, notre institut "
                "allie savoir-faire, écoute et douceur pour vous offrir des soins sur mesure, dans un cadre "
                "chaleureux et confidentiel."
            ),
            about_ar=(
                "منذ سنة 2015، يرافق مركز NOON نساء بومهل البساتين والمنطقة بأكملها في لحظات الاسترخاء والجمال. "
                "أسّسته سلوى نجاح، ويجمع معهدنا بين الخبرة والإصغاء واللطف لنقدّم لكِ عناية مخصّصة في أجواء دافئة وخاصة."
            ),
            latitude="36.724800",
            longitude="10.292000",
        ))
        if obj.latitude is None or obj.longitude is None:
            obj.latitude = "36.724800"
            obj.longitude = "10.292000"
            obj.save(update_fields=['latitude', 'longitude'])
        self.stdout.write(self.style.SUCCESS('Site settings ready'))

        # Opening hours: closed Monday, open every other day 09:00-19:00
        for wd in range(7):
            OpeningHour.objects.update_or_create(
                weekday=wd,
                defaults=dict(
                    is_closed=(wd == 0),
                    open_time=None if wd == 0 else time(9, 0),
                    close_time=None if wd == 0 else time(19, 0),
                )
            )
        self.stdout.write(self.style.SUCCESS('Opening hours ready'))

        # Every category and service lasts 30 minutes.
        duration = 30
        categories_data = [
            ('corps', 'Hammam & Corps', 'الحمّام والجسم', 0),
            ('visage', 'Visage', 'الوجه', 1),
            ('epilation', 'Épilation', 'إزالة الشعر', 2),
            ('mains', 'Mains, pieds & ongles', 'اليدين والقدمين والأظافر', 3),
            ('coiffure', 'Coiffure', 'تصفيف الشعر', 4),
        ]
        cats = {}
        for slug, name_fr, name_ar, order in categories_data:
            cat, _ = ServiceCategory.objects.update_or_create(
                slug=slug, defaults=dict(name_fr=name_fr, name_ar=name_ar, order=order, duration_minutes=duration)
            )
            cats[slug] = cat
        self.stdout.write(self.style.SUCCESS('Categories ready'))

        # (category, name_fr, name_ar, price, is_package, old_price, price_is_from)
        services_data = [
            ('corps', 'Hammam', 'حمّام', 15, False, None, False),
            ('corps', 'Gommage corps', 'تقشير الجسم', 10, False, None, False),
            ('corps', "Enveloppement à l'argile verte", 'لفافة بالطين الأخضر', 15, False, None, False),
            ('corps', 'Massage relaxant corps 30 min', 'مساج استرخاء للجسم 30 دقيقة', 40, False, None, False),
            ('corps', "Hammam + gommage + enveloppement à l'argile verte",
             'حمّام + تقشير + لفافة بالطين الأخضر', 35, True, 40, False),
            ('corps', 'Hammam + gommage + massage relaxant 30 min',
             'حمّام + تقشير + مساج استرخاء 30 دقيقة', 60, True, 65, False),
            ('corps', 'Massage relaxant 45 min + douche + brushing',
             'مساج استرخاء 45 دقيقة + دوش + براشينغ', 80, True, None, False),

            ('visage', 'Nettoyage de peau', 'تنظيف البشرة', 90, False, None, False),
            ('visage', "Coup d'éclat visage", 'إشراقة الوجه', 40, False, None, False),
            ('visage', 'Masque apaisant', 'قناع مهدّئ', 15, False, None, False),
            ('visage', "Nettoyage de peau + coup d'éclat", 'تنظيف البشرة + إشراقة الوجه', 120, True, 130, False),
            ('visage', "Coup d'éclat visage + brushing", 'إشراقة الوجه + براشينغ', 60, True, 65, False),

            ('epilation', 'Jambes complètes', 'الساقين كاملتين', 40, False, None, False),
            ('epilation', 'Bras', 'الذراعين', 20, False, None, False),
            ('epilation', 'Aisselles', 'الإبطين', 15, False, None, False),
            ('epilation', 'Visage', 'الوجه', 20, False, None, False),
            ('epilation', 'Sourcils', 'الحواجب', 12, False, None, False),
            ('epilation', 'Lèvre supérieure', 'الشفة العليا', 10, False, None, False),
            ('epilation', 'Bras + aisselles', 'الذراعين + الإبطين', 30, True, 35, False),
            ('epilation', 'Visage + masque apaisant', 'الوجه + قناع مهدّئ', 30, True, 35, False),
            ('epilation', 'Sourcils + lèvre supérieure', 'الحواجب + الشفة العليا', 20, True, 22, False),

            ('mains', 'Soins des mains', 'العناية باليدين', 25, False, None, False),
            ('mains', 'Soins des pieds', 'العناية بالقدمين', 40, False, None, False),
            ('mains', 'Vernis permanent', 'طلاء أظافر دائم', 30, False, None, False),
            ('mains', 'Capsules gel', 'كبسولات جل', 30, False, None, False),
            ('mains', 'Gel sur ongles naturels', 'جل على الأظافر الطبيعية', 30, False, None, False),
            ('mains', 'Capsules gel + vernis permanent', 'كبسولات جل + طلاء دائم', 50, True, 60, False),
            ('mains', 'Gel sur ongles naturels + vernis permanent',
             'جل على الأظافر الطبيعية + طلاء دائم', 50, True, 60, False),

            ('coiffure', 'Brushing', 'براشينغ', 25, False, None, False),
            ('coiffure', 'Coupe', 'قصّ الشعر', 40, False, None, False),
            ('coiffure', 'Égalisation des pointes', 'تسوية الأطراف', 15, False, None, False),
            ('coiffure', 'Coloration', 'صبغة', 50, False, None, False),
            ('coiffure', 'Coloration mèches', 'ميش ملوّن', 180, False, None, True),
            ('coiffure', 'Coupe + brushing', 'قصّ + براشينغ', 60, True, 65, False),
            ('coiffure', 'Coloration + égalisation + brushing', 'صبغة + تسوية الأطراف + براشينغ', 80, True, 90, False),
            ('coiffure', 'Coloration mèches + égalisation + brushing',
             'ميش ملوّن + تسوية الأطراف + براشينغ', 200, True, None, True),
        ]
        for i, (cat_slug, nfr, nar, price, is_pkg, old_price, is_from) in enumerate(services_data):
            Service.objects.update_or_create(
                name_fr=nfr, category=cats[cat_slug],
                defaults=dict(
                    name_ar=nar, description_fr='', description_ar='',
                    price_tnd=price, is_package=is_pkg, old_price_tnd=old_price, price_is_from=is_from,
                    duration_minutes=duration, is_active=True, order=i,
                )
            )
        self.stdout.write(self.style.SUCCESS(f'{len(services_data)} services ready'))

        # Starter services from the first version of the site, no longer offered.
        # Hidden rather than deleted so past bookings keep their history.
        retired = [
            'Soin du visage classique', 'Soin anti-âge', 'Soin éclat & hydratation',
            'Massage relaxant (1h)', 'Massage ciblé (30 min)', 'Gommage corporel',
            'Enveloppement minceur', 'Forfait Journée Détente', 'Demi-jambes', 'Maillot',
            'Manucure', 'Pédicure', 'Pose vernis semi-permanent',
        ]
        hidden = Service.objects.filter(name_fr__in=retired, is_active=True).update(is_active=False)
        self.stdout.write(self.style.SUCCESS(f'{hidden} old services hidden'))

        self.stdout.write(self.style.SUCCESS('Testimonials are submitted by client accounts'))

        gallery_data = [
            ('L’espace NOON', 'فضاء نون', '/photos/center-noon-front.jpeg',
             'Un espace chaleureux pensé pour votre confort et votre intimité.',
             'فضاء دافئ صُمّم لراحتك وخصوصيتك.'),
            ('Soins du visage', 'العناية بالوجه', '/photos/visage.jpg',
             'Des soins précis pour révéler l’éclat naturel de votre peau.',
             'عنايات دقيقة لإبراز الإشراقة الطبيعية لبشرتك.'),
            ('Rituels du corps', 'عناية الجسم', '/photos/corps.jpg',
             'Un moment de détente profonde dans une atmosphère apaisante.',
             'لحظة استرخاء عميق في أجواء هادئة.'),
            ('Beauté des mains', 'جمال اليدين', '/photos/mains.jpg',
             'Des finitions soignées pour des mains élégantes au quotidien.',
             'لمسات متقنة ليدين أنيقتين كل يوم.'),
        ]
        for i, (title_fr, title_ar, image_url, dfr, dar) in enumerate(gallery_data):
            GalleryItem.objects.update_or_create(
                title_fr=title_fr,
                defaults=dict(title_ar=title_ar, image_url=image_url, description_fr=dfr,
                              description_ar=dar, order=i),
            )
        self.stdout.write(self.style.SUCCESS(f'{len(gallery_data)} gallery photos ready'))

        self.stdout.write(self.style.SUCCESS('Seed complete.'))
