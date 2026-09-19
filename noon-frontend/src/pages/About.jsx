import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { api } from '../api';
import WaveDivider from '../components/WaveDivider';
import { AboutScene, IconSparkle, IconLeaf, IconFace, IconPetal, IconHand } from '../components/Illustrations';

const CATEGORY_ICONS = {
  visage: IconFace,
  corps: IconLeaf,
  epilation: IconPetal,
  mains: IconHand,
  coiffure: IconSparkle,
  spa: IconSparkle,
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

  return (
    <>
      <section style={{ paddingTop: 60 }}>
        <div className="section-inner about-grid">
          <div className="about-portrait">
            <AboutScene className="about-scene-art" />
            <div className="cap">
              <b>{founder}</b>
              <span>{t('Fondatrice, NOON Center', 'مؤسسة مركز NOON')}</span>
            </div>
          </div>
          <div>
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
              <div className="stat"><b>{year}</b><span>{t('Année de création', 'سنة التأسيس')}</span></div>
              <div className="stat"><b>6/7</b><span>{t('Jours ouverts par semaine', 'أيام العمل أسبوعياً')}</span></div>
              <div className="stat"><b>25K+</b><span>{t('Clientes sur Facebook', 'متابعة على فيسبوك')}</span></div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ marginTop: 60 }}><WaveDivider /></div>

      <section className="bg-alt">
        <div className="section-inner">
          <div className="section-head">
            <div className="kicker">{t('Nos valeurs', 'قيمنا')}</div>
            <h2>{t('Ce qui guide chaque soin', 'ما يوجّه كل عناية نقدّمها')}</h2>
          </div>
          <div className="values">
            <div className="v">
              <div className="value-icon"><IconFace /></div>
              <h4>{t('Écoute', 'الإصغاء')}</h4>
              <p>{t('Chaque soin commence par un échange pour comprendre vos besoins réels.', 'كل عناية تبدأ بحوار لفهم احتياجاتكِ الحقيقية.')}</p>
            </div>
            <div className="v">
              <div className="value-icon"><IconLeaf /></div>
              <h4>{t('Discrétion', 'الخصوصية')}</h4>
              <p>{t('Un espace pensé pour les femmes, à l\'abri des regards.', 'فضاء مخصّص للنساء بعيداً عن الأنظار.')}</p>
            </div>
            <div className="v">
              <div className="value-icon"><IconSparkle /></div>
              <h4>{t('Savoir-faire', 'الخبرة')}</h4>
              <p>{t('Des techniques éprouvées, mises à jour au fil des années.', 'تقنيات مجرّبة تُحدَّث باستمرار على مر السنين.')}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="section-inner">
          <div className="section-head">
            <div className="kicker">{t('Nos soins', 'عناياتنا')}</div>
            <h2>{t('Vos soins, décrits en détail', 'عناياتكم، موصوفة بالتفصيل')}</h2>
          </div>
          <div className="univ-grid">
            {categories
              .filter((c) => c.services.some((s) => s.is_active))
              .map((c) => {
                const CatIcon = CATEGORY_ICONS[c.slug] || IconSparkle;
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
                        {CatIcon && <CatIcon className="univ-card-icon" />}
                        <h3>{t(c.name_fr, c.name_ar)}</h3>
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

      <section className="bg-deep">
        <div className="section-inner cta-row">
          <div>
            <h2>{t('Venez nous rencontrer', 'تعالي للتعرف علينا')}</h2>
            <p>{t('À Boumhel El Bassatine, en face de la BIAT.', 'ببومهل البساتين، مقابل البنك BIAT.')}</p>
          </div>
          <Link to="/contact" className="btn btn-gold">{t("Voir l'itinéraire", 'عرض الاتجاهات')}</Link>
        </div>
      </section>
    </>
  );
}