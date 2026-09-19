import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLang } from '../context/LangContext';
import { api } from '../api';
import { Smile, Leaf, Sparkles, ChevronsRight } from 'lucide-react';
import ElasticGallery from '../components/ElasticGallery';
import Testimonials from '../components/Testimonials';
import { SpinningBorderLink } from '../components/SpinningBorderButton';

export default function Home() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.getTestimonials().then(setTestimonials).catch(() => {});
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('reveal-in'));
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
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <section className="hero">
        <img className="hero-img" src="/photos/center-noon-front.jpeg" alt="" aria-hidden="true" />
        <div className="hero-copy">
          <div className="hero-eyebrow">{t("L'instant où la lumière est la plus pure", 'اللحظة التي يكون فيها الضوء في أنقى حالاته')}</div>
          <h1>{t('Votre moment', 'لحظتك الخاصة')} <span className="hero-accent">{t('de beauté et de sérénité', 'من الجمال والهدوء')}</span></h1>
          <p className="lead">
            {t(
              `NOON Center est un spa & institut d'esthétique pour femme, niché à Boumhel El Bassatine. Depuis ${settings?.founded_year || 2015}, nous prenons soin de vous avec des soins sur mesure, dans un cadre chaleureux et confidentiel.`,
              `مركز NOON هو سبا ومعهد تجميل مخصّص للمرأة، يقع ببومهل البساتين. منذ سنة ${settings?.founded_year || 2015} ونحن نعتني بكِ بعناية مخصّصة، في أجواء دافئة وخاصة.`
            )}
          </p>
          <div className="hero-ctas">
            <Link to="/contact#booking" className="btn btn-gold hero-book-btn">
              <span>{t('Réserver via WhatsApp', 'احجزي عبر واتساب')}</span>
              <svg className="reservation-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
              </svg>
            </Link>
            <Link to="/services" className="btn btn-ghost">{t('Découvrir nos soins', 'اكتشفي خدماتنا')}</Link>
          </div>
        </div>
      </section>

      <section className="bg-alt reveal">
        <div className="section-inner">
          <div className="section-head">
            <div className="kicker">{t('Nos univers de soin', 'عوالم العناية لدينا')}</div>
            <h2>{t('Trois façons de prendre soin de vous', 'ثلاث طرق للعناية بنفسك')}</h2>
          </div>
          <div className="values">
            <Link to="/services?category=visage#service-visage" className="v v-face">
              <div className="value-photo"><img src="/photos/visage.jpg" alt={t('Soin du visage', 'العناية بالوجه')} loading="lazy" /></div>
              <div className="value-icon"><Smile strokeWidth={1.8} /><span>{t('Visage', 'العناية بالوجه')} <b className="value-icon-arrow" aria-hidden="true">›</b></span></div>
              <h4>{t('Visage', 'العناية بالوجه')}</h4>
              <p>{t('Nettoyages, soins anti-âge et éclat, adaptés à chaque type de peau.', 'تنظيف البشرة، عناية مضادة للشيخوخة وإشراقة، حسب نوع بشرتك.')}</p>
            </Link>
            <Link to="/services?category=corps#service-corps" className="v v-body">
              <div className="value-photo"><img src="/photos/corps.jpg" alt={t('Soin du corps', 'العناية بالجسم')} loading="lazy" /></div>
              <div className="value-icon"><Leaf strokeWidth={1.8} /><span>{t('Corps', 'العناية بالجسم')} <b className="value-icon-arrow" aria-hidden="true">›</b></span></div>
              <h4>{t('Corps', 'العناية بالجسم')}</h4>
              <p>{t('Massages relaxants, gommages et enveloppements minceur.', 'مساج للاسترخاء، تقشير للجسم ولفافات لنحت الجسم.')}</p>
            </Link>
            <Link to="/services?category=mains#service-mains" className="v v-beauty">
              <div className="value-photo"><img src="/photos/mains.jpg" alt={t('Beauté des mains', 'جمال اليدين')} loading="lazy" /></div>
              <div className="value-icon"><Sparkles strokeWidth={1.8} /><span>{t('Beauté', 'الجمال')} <b className="value-icon-arrow" aria-hidden="true">›</b></span></div>
              <h4>{t('Beauté', 'الجمال')}</h4>
              <p>{t('Épilation, manucure et pédicure pour un rendu impeccable.', 'إزالة الشعر، العناية بالأظافر لليدين والقدمين بلمسة أنيقة.')}</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="gallery-section reveal">
        <div className="section-inner">
          <div className="section-head">
            <div className="kicker">{t('Notre galerie', 'معرضنا')}</div>
            <h2
              className="gallery-heading-link"
              role="link"
              tabIndex={0}
              onClick={() => navigate('/gallery')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate('/gallery');
                }
              }}
            >
              <span className="gallery-heading-default">{t("L'ambiance NOON en images", 'أجواء NOON بالصور')}</span>
              <span className="gallery-heading-hover">
                {t('Voir plus de photos', 'عرض المزيد من الصور')}
                <ChevronsRight className="gallery-heading-hover-arrow" strokeWidth={3} aria-hidden="true" />
              </span>
            </h2>
          </div>
          <ElasticGallery />
        </div>
      </section>

      <section className="reveal">
        <div className="section-inner">
          <div className="section-head testi-section-head">
            <div className="kicker">{t('Ce que disent nos clientes', 'آراء زبوناتنا')}</div>
            <h2>
              {t('Une communauté fidèle', 'مجتمع من الزبونات الوفيّات')}
            </h2>
          </div>
          {testimonials.length === 0 && (
            <p>{t('Chargement...', 'جاري التحميل...')}</p>
          )}
          <Testimonials testimonials={testimonials} />
        </div>
      </section>

      <section className="bg-deep reveal">
        <div className="section-inner cta-row">
          <div>
            <h2>{t('Prête pour votre moment NOON ?', 'مستعدة للحظتك مع NOON؟')}</h2>
            <p>{t('Ouvert tous les jours sauf le lundi. Réservez en quelques secondes.', 'مفتوح كل أيام الأسبوع ما عدا يوم الاثنين. احجزي في ثوانٍ معدودة.')}</p>
          </div>
          <SpinningBorderLink to="/contact#booking">{t('Réserver maintenant', 'احجزي الآن')}</SpinningBorderLink>
        </div>
      </section>
    </>
  );
}
