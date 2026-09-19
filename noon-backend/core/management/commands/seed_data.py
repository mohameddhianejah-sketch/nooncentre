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

        categories_data = [
            ('visage', 'Visage', 'الوجه', 0, 30),
            ('corps', 'Corps', 'الجسم', 1, 30),
            ('epilation', 'Épilation', 'إزالة الشعر', 2, 30),
            ('mains', 'Mains & pieds', 'اليدين والقدمين', 3, 30),
        ]
        cats = {}
        for slug, name_fr, name_ar, order, duration in categories_data:
            cat, _ = ServiceCategory.objects.update_or_create(
                slug=slug, defaults=dict(name_fr=name_fr, name_ar=name_ar, order=order, duration_minutes=duration)
            )
            cats[slug] = cat
        self.stdout.write(self.style.SUCCESS('Categories ready'))

        services_data = [
            ('visage', 'Nettoyage de peau', 'تنظيف البشرة', 'Purifie et débarrasse la peau des impuretés.',
             'تنقية البشرة والتخلص من الشوائب.', 50, False, None),
            ('visage', 'Soin du visage classique', 'عناية كلاسيكية بالوجه', 'Nettoyage, gommage, masque et hydratation.',
             'تنظيف، تقشير، قناع وترطيب.', 60, False, None),
            ('visage', 'Soin anti-âge', 'عناية مضادة للشيخوخة', 'Raffermit et redonne éclat aux peaux matures.',
             'يشد البشرة الناضجة ويمنحها الإشراق.', 90, False, None),
            ('visage', 'Soin éclat & hydratation', 'عناية بالإشراق والترطيب', 'Idéal avant un événement.',
             'مثالية قبل مناسبة.', 70, False, None),

            ('corps', 'Massage relaxant (1h)', 'مساج للاسترخاء (ساعة)', 'Détente profonde de tout le corps.',
             'استرخاء عميق لكامل الجسم.', 80, False, None),
            ('corps', 'Massage ciblé (30 min)', 'مساج موضعي (30 د)', 'Dos, nuque et épaules.',
             'الظهر والرقبة والكتفين.', 45, False, None),
            ('corps', 'Gommage corporel', 'تقشير الجسم', 'Exfolie et adoucit la peau.',
             'يقشّر البشرة ويجعلها ناعمة.', 60, False, None),
            ('corps', 'Enveloppement minceur', 'لفافات لنحت الجسم', 'Affine la silhouette, effet drainant.',
             'ينحت القوام بتأثير مصفٍّ.', 90, False, None),

            ('epilation', 'Demi-jambes', 'نصف الساقين', '', '', 20, False, None),
            ('epilation', 'Jambes complètes', 'الساقين كاملتين', '', '', 35, False, None),
            ('epilation', 'Aisselles', 'الإبطين', '', '', 15, False, None),
            ('epilation', 'Maillot', 'منطقة البيكيني', '', '', 20, False, None),
            ('epilation', 'Sourcils', 'الحواجب', '', '', 10, False, None),

            ('mains', 'Manucure', 'مانيكير', '', '', 25, False, None),
            ('mains', 'Pédicure', 'بديكير', '', '', 35, False, None),
            ('mains', 'Pose vernis semi-permanent', 'طلاء أظافر شبه دائم', '', '', 30, False, None),

            ('corps', 'Forfait Journée Détente', 'باقة يوم استرخاء',
             "Soin du visage + gommage corporel + massage relaxant d'une heure.",
             'عناية بالوجه + تقشير للجسم + مساج استرخاء لمدة ساعة.', 180, True, 220),
        ]
        for i, (cat_slug, nfr, nar, dfr, dar, price, is_pkg, old_price) in enumerate(services_data):
            Service.objects.update_or_create(
                name_fr=nfr, category=cats[cat_slug],
                defaults=dict(
                    name_ar=nar, description_fr=dfr, description_ar=dar,
                    price_tnd=price, is_package=is_pkg, old_price_tnd=old_price, order=i,
                )
            )
        self.stdout.write(self.style.SUCCESS(f'{len(services_data)} services ready'))

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
