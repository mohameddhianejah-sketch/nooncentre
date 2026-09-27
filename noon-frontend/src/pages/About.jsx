import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { api } from '../api';
import { ScanFace, Leaf, Sparkles, Hand, Scissors, Waves } from 'lucide-react';
import { AboutScene } from '../components/Illustrations';
import { SpinningBorderLink } from '../components/SpinningBorderButton';

const CATEGORY_ICONS = {
  visage: ScanFace,
  corps: Leaf,
  epilation: Sparkles,
  mains: Hand,
  coiffure: Scissors,
  spa: Waves,
};

export default function About() {
  const { t } = useLang();
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  const founder = settings?.founder_name || 'Saloua Nejah';
  const year = settings?.founded_year || 2015;
  const yearsActive = new Date().getFullYear() - year;
  const founderPhoto = settings?.founder_photo || '';

  useEffect(() => {
    const counters = document.querySelectorAll('.stat b[data-count-target]');
    if (!counters.length) return;

    const animateCounter = (el) => {
      const shouldAnimate = el.dataset.countAnimate !== 'false';
      if (!shouldAnimate) {
        el.textContent = el.dataset.countStatic || el.textContent;
        return;
      }

      const target = Number(el.dataset.countTarget || 0);
      const prefix = el.dataset.countPrefix || '';
      const suffix = el.dataset.countSuffix || '';
      const start = performance.now();
      const duration = 1800;

      const tick = (timestamp) => {
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const nextValue = Math.round(target * eased);
        el.textContent = `${prefix}${nextValue}${suffix}`;
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = `${prefix}${target}${suffix}`;
        }
      };

      requestAnimationFrame(tick);
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });

      counters.forEach((counter) => observer.observe(counter));
      return () => observer.disconnect();
    }

    counters.forEach(animateCounter);
  }, [settings]);

  useEffect(() => {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      revealEls.forEach((el) => el.classList.add('reveal-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );

    revealEls.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <section className="reveal" style={{ paddingTop: 60, paddingBottom: 24 }}>
        <div className="section-inner about-grid">
          <div className="about-portrait reveal">
            {founderPhoto ? (
              <img src={founderPhoto} alt={founder} className="about-founder-photo" />
            ) : (
              <AboutScene className="about-scene-art" />
            )}
            <div className="cap">
              <b>{founder}</b>
              <span>{t('Fondatrice, NOON Center', 'مؤسسة مركز NOON')}</span>
            </div>
          </div>
          <div className="about-copy reveal">
            <div className="kicker">{t('Notre histoire', 'قصتنا')}</div>
            <h2>{t(`${yearsActive} ans à prendre soin de vous`, `${yearsActive} عاماً من العناية بكِ`)}</h2>
            <p>{settings?.about_fr ? t(settings.about_fr, settings.about_ar) : t(
              `Depuis ${year}, NOON Center accompagne les femmes de Boumhel El Bassatine et de toute la région dans leurs moments de détente et de beauté. Fondé par ${founder}, notre institut allie savoir-faire, écoute et douceur pour vous offrir des soins sur mesure, dans un cadre chaleureux et confidentiel.`,
              `منذ سنة ${year}، يرافق مركز NOON نساء بومهل البساتين والمنطقة بأكملها في لحظات الاسترخاء والجمال.`
            )}</p>
            <p>{t(
              "Le nom « NOON » évoque le midi — l'instant où la lumière est à son sommet. C'est l'état que nous voulons vous offrir à chaque visite : clarté, équilibre et bien-être retrouvé.",
              'اسم «NOON» يعني الظهيرة، اللحظة التي يبلغ فيها الضوء أوجّه. وهذا بالضبط ما نريد أن نمنحه لكِ في كل زيارة: صفاء، توازن وإحساس متجدد بالراحة.'
            )}</p>

            <div className="stat-row">
              <div className="stat"><b data-count-static={String(year)} data-count-animate="false">{year}</b><span>{t('Année de création', 'سنة التأسيس')}</span></div>
              <div className="stat"><b data-count-static="6/7" data-count-animate="false">6/7</b><span>{t('Jours ouverts par semaine', 'أيام العمل أسبوعياً')}</span></div>
              <div className="stat"><b data-count-target="25" data-count-suffix="K+" data-count-prefix="" data-count-animate="true">0K+</b><span>{t('Clientes sur Facebook', 'متابعة على فيسبوك')}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-services-section reveal">
        <div className="section-inner">
          <div className="section-head reveal">
            <div className="kicker">{t('Nos soins', 'عناياتنا')}</div>
            <h2>{t('Vos soins, décrits en détail', 'عناياتكم، موصوفة بالتفصيل')}</h2>
          </div>
          <div className="univ-grid">
            {categories
              .filter((c) => c.services.some((s) => s.is_active))
              .map((c) => {
                const CatIcon = CATEGORY_ICONS[c.slug] || Sparkles;
                return (
                  <article className="univ-card" key={c.id}>
                    <div className="univ-photo">
                      <span className="univ-photo-label">
                        {t('Photo à ajouter', 'أضيفي صورة')} — {t(c.name_fr, c.name_ar)}
                      </span>
                      <img
                        src={`/photos/${c.slug}.jpg`}
                        alt={t(c.name_fr, c.name_ar)}
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <div className="univ-card-body">
                      <div className="univ-card-head">
                        {CatIcon && <CatIcon className="univ-card-icon" strokeWidth={1.7} />}
                        <h1 className="univ-card-title">{t(c.name_fr, c.name_ar)}</h1>
                      </div>
                      {t(c.description_fr, c.description_ar) && (
                        <p className="univ-desc">{t(c.description_fr, c.description_ar)}</p>
                      )}
                      <div className="univ-card-foot">
                        <Link to="/services" className="btn btn-ghost btn-sm">
                          {t('Tous les soins', 'كل العنايات')}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </div>
      </section>

      <section className="bg-deep about-cta-section reveal">
        <div className="section-inner cta-row reveal">
          <div>
            <h2>{t('Venez nous rencontrer', 'تعالي للتعرف علينا')}</h2>
            <p>{t('À Boumhel El Bassatine, en face de la BIAT.', 'ببومهل البساتين، مقابل البنك BIAT.')}</p>
          </div>
          <SpinningBorderLink to="/contact">{t("Voir l'itinéraire", 'عرض الاتجاهات')}</SpinningBorderLink>
        </div>
      </section>
    </>
  );
}