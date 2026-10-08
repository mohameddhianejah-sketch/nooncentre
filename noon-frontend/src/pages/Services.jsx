import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { api } from '../api';
import { ScanFace, Leaf, Sparkles, Hand } from 'lucide-react';
import { SpinningBorderLink } from '../components/SpinningBorderButton';
import './services.css';

const CATEGORY_ICONS = {
  visage: ScanFace,
  corps: Leaf,
  epilation: Sparkles,
  mains: Hand,
};

function bookUrl(serviceId) {
  return `/contact?service=${serviceId}#booking`;
}

export default function Services() {
  const { t } = useLang();
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCategories().then((data) => {
      setCategories(data);
      const requestedCategory = new URLSearchParams(window.location.search).get('category');
      if (data.some((category) => category.slug === requestedCategory)) {
        setActiveCat(requestedCategory);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
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
  }, [loading, categories.length]);

  useEffect(() => {
    if (activeCat !== 'all' && categories.length > 0) {
      document.getElementById(`service-${activeCat}`)?.scrollIntoView({ block: 'start' });
    }
  }, [activeCat, categories]);

  const packages = categories.flatMap((c) => c.services.filter((s) => s.is_active && s.is_package));
  const visibleCats = categories.filter((c) => activeCat === 'all' || c.slug === activeCat);
  const totalActive = categories.reduce(
    (n, c) => n + c.services.filter((s) => s.is_active && !s.is_package).length,
    0
  );
  const bestDiscount = packages.reduce((best, p) => {
    if (p.old_price_tnd && Number(p.old_price_tnd) > Number(p.price_tnd)) {
      const d = Math.round((1 - Number(p.price_tnd) / Number(p.old_price_tnd)) * 100);
      return Math.max(best, d);
    }
    return best;
  }, 0);
  const comboLabels = packages.slice(0, 3).map((p) => t(p.name_fr, p.name_ar));

  return (
    <>
      <section className="svc-intro reveal">
        <div className="section-inner">
          <div className="svc-intro-layout">
            <div className="svc-intro-copy">
              <div className="kicker">{t('Carte des soins', 'قائمة العنايات')}</div>
              <h2>{t('Choisissez le soin qui vous ressemble', 'اختاري العناية التي تناسبكِ')}</h2>
              <p>
                {t(
                  'Visage, corps, épilation, mains et pieds — chaque soin est pensé pour un moment à vous. Les tarifs sont en dinars tunisiens (TND). Vous pouvez réserver un ou plusieurs soins en même temps.',
                  'وجه، جسم، إزالة الشعر، يدان وقدمان — كل عناية مصمّمة للحظتك الخاصة. الأسعار بالدينار التونسي. يمكنكِ حجز عناية واحدة أو أكثر في الموعد نفسه.'
                )}
              </p>
              {!loading && (
                <div className="svc-intro-meta">
                  <span><b>{categories.length}</b> {t('univers', 'عوالم')}</span>
                  <span><b>{totalActive}</b> {t('soins', 'عنايات')}</span>
                  {packages.length > 0 && (
                    <span><b>{packages.length}</b> {t(packages.length > 1 ? 'forfaits' : 'forfait', 'باقات')}</span>
                  )}
                </div>
              )}
            </div>

            {!loading && packages.length > 0 && (
              <div className="svc-forfait-promo">
                <div className="sfp-badge">
                  {bestDiscount > 0 ? <><b>-{bestDiscount}%</b><small>Économie</small></> : <b>Combo</b>}
                </div>
                <div className="sfp-kicker">{t('Forfaits & combos', 'الباقات والتركيبات')}</div>
                <h3>{t('Plusieurs soins, un seul tarif avantageux', 'عدة عنايات بسعر واحد مفضّل')}</h3>
                <p>
                  {t(
                    'Nous composons des forfaits en combinant vos soins préférés. Découvrez nos associations et profitez d\'un prix plus doux.',
                    'نصمّم باقات تجمع عناياتكِ المفضلة. اكتشفي تشكيلاتنا واستفيدي من سعر أجمل.'
                  )}
                </p>
                {comboLabels.length > 0 && (
                  <div className="sfp-tags">
                    {comboLabels.map((label) => <span key={label}>{label}</span>)}
                  </div>
                )}
                <SpinningBorderLink href="#forfaits">{t('Voir les forfaits', 'اكتشفي الباقات')}</SpinningBorderLink>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="svc-main reveal">
        <div className="section-inner">
          {loading && <p>{t('Chargement...', 'جاري التحميل...')}</p>}

          {!loading && (
            <>
              <div className="svc-tabs">
                <button className={activeCat === 'all' ? 'active' : ''} onClick={() => setActiveCat('all')}>
                  {t('Tout', 'الكل')}
                </button>
                {categories.map((c) => (
                  <button key={c.slug} className={activeCat === c.slug ? 'active' : ''} onClick={() => setActiveCat(c.slug)}>
                    {t(c.name_fr, c.name_ar)}
                  </button>
                ))}
              </div>

              {visibleCats.map((c) => {
                const items = c.services.filter((s) => s.is_active && !s.is_package);
                if (items.length === 0) return null;
                const CatIcon = CATEGORY_ICONS[c.slug];
                return (
                  <div className="svc-block reveal" id={`service-${c.slug}`} key={c.id}>
                    <div className="svc-block-head">
                      <h3>
                        {CatIcon && <CatIcon className="svc-block-icon" strokeWidth={1.7} />}
                        {t(c.name_fr, c.name_ar)}
                      </h3>
                      <span>{items.length} {t('soins', 'عنايات')}</span>
                    </div>
                    <div className="svc-block-photo">
                      <img
                        src={`/photos/${c.slug}.jpg`}
                        alt={t(c.name_fr, c.name_ar)}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div className="svc-grid">
                      {items.map((s) => (
                        <article className="svc-card" key={s.id}>
                          <div className="svc-card-body">
                            <h4 className="svc-name">{t(s.name_fr, s.name_ar)}</h4>
                            {(s.description_fr || s.description_ar) ? (
                              <p className="svc-desc">{t(s.description_fr, s.description_ar)}</p>
                            ) : (
                              <p className="svc-desc svc-desc-muted">{t('Demandez-nous le détail en réservant.', 'اطلبي التفاصيل عند الحجز.')}</p>
                            )}
                          </div>
                          <div className="svc-card-foot">
                            <div className="svc-price">{s.price_is_from && <small>{t('À partir de', 'ابتداءً من')} </small>}{s.price_tnd} <small>TND</small></div>
                            <Link to={bookUrl(s.id)} className="btn btn-ghost btn-sm">
                              {t('Réserver', 'احجزي')}
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}

              {packages.length > 0 && (activeCat === 'all' || packages.some((p) => {
                const cat = categories.find((c) => c.services.some((s) => s.id === p.id));
                return cat?.slug === activeCat;
              })) && (
                <div className="svc-block reveal" id="forfaits">
                  <div className="svc-block-head">
                    <h3>{t('Forfaits', 'الباقات')}</h3>
                    <span>{t('Le meilleur de NOON, en un rendez-vous', 'أفضل ما في NOON في موعد واحد')}</span>
                  </div>
                  <div className="svc-packages">
                    {packages
                      .filter((p) => {
                        if (activeCat === 'all') return true;
                        const cat = categories.find((c) => c.services.some((s) => s.id === p.id));
                        return cat?.slug === activeCat;
                      })
                      .map((p) => (
                        <div className="package-card" key={p.id}>
                          <div>
                            <h3>{t(p.name_fr, p.name_ar)}</h3>
                            <p>{t(p.description_fr, p.description_ar)}</p>
                          </div>
                          <div className="package-side">
                            <div className="price">
                              {p.price_is_from && <small>{t('À partir de', 'ابتداءً من')} </small>}{p.price_tnd} <small>TND{p.old_price_tnd ? ` — ${t('au lieu de', 'بدل')} ${p.old_price_tnd}` : ''}</small>
                            </div>
                            <SpinningBorderLink to={bookUrl(p.id)}>{t('Réserver ce forfait', 'احجزي هذه الباقة')}</SpinningBorderLink>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <p className="price-note">
                {t(
                  '* Tarifs indicatifs, pouvant varier selon la spécificité de chaque cas. Merci de confirmer par téléphone ou WhatsApp.',
                  '* الأسعار تقريبية وقد تختلف حسب خصوصية كل حالة. يرجى التأكيد عبر الهاتف أو واتساب.'
                )}
              </p>
            </>
          )}
        </div>
      </section>

      <section className="bg-deep reveal">
        <div className="section-inner cta-row">
          <div>
            <h2>{t('Envie de combiner plusieurs soins ?', 'تريدين الجمع بين عدة عنايات؟')}</h2>
            <p>{t('Cochez tous ceux que vous souhaitez dans le formulaire de réservation.', 'حدّدي كل ما ترغبين به في استمارة الحجز.')}</p>
          </div>
          <SpinningBorderLink to="/contact#booking">{t('Réserver maintenant', 'احجزي الآن')}</SpinningBorderLink>
        </div>
      </section>
    </>
  );
}
