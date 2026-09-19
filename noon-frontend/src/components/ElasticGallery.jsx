import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useLang } from '../context/LangContext';

const DEFAULT_ITEMS = [
  {
    id: '01',
    src: '/photos/center-noon-front.jpeg',
    category_fr: 'Notre institut',
    category_ar: 'معهدنا',
    title_fr: "L'entrée",
    title_ar: 'المدخل',
    alt_fr: 'La façade de NOON Center à Boumhel El Bassatine',
    alt_ar: 'واجهة مركز NOON في بومهل البساتين',
  },
  {
    id: '02',
    src: '/photos/spa.jpg',
    category_fr: 'Espace détente',
    category_ar: 'ركن الاسترخاء',
    title_fr: 'Le cocon spa',
    title_ar: 'ركن السبا',
    alt_fr: "L'espace détente et bien-être du spa",
    alt_ar: 'ركن الاسترخاء والعناية في السبا',
  },
  {
    id: '03',
    src: '/photos/visage.jpg',
    category_fr: 'Visage',
    category_ar: 'العناية بالوجه',
    title_fr: 'Soin du visage',
    title_ar: 'عناية البشرة',
    alt_fr: 'Un soin du visage réalisé chez NOON Center',
    alt_ar: 'عناية بالوجه في مركز NOON',
  },
  {
    id: '04',
    src: '/photos/corps.jpg',
    category_fr: 'Corps',
    category_ar: 'العناية بالجسم',
    title_fr: 'Rituel du corps',
    title_ar: 'عناية الجسم',
    alt_fr: 'Massage et soin du corps',
    alt_ar: 'مساج وعناية بالجسم',
  },
  {
    id: '05',
    src: '/photos/mains.jpg',
    category_fr: 'Mains & pieds',
    category_ar: 'اليدين والقدمين',
    title_fr: 'Manucure',
    title_ar: 'عناية اليدين',
    alt_fr: 'Manucure et pédicure soignées',
    alt_ar: 'عناية أنيقة باليدين والقدمين',
  },
];

export default function ElasticGallery({ items = DEFAULT_ITEMS, initialActive = 0 }) {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(initialActive);

  return (
    <div className="gallery-view" role="group" aria-label={t('Galerie photos', 'معرض الصور')}>
      {items.map((item, index) => {
        const active = index === activeIndex;
        const alt = lang === 'ar' ? item.alt_ar : item.alt_fr;
        return (
          <button
            type="button"
            key={item.id}
            className={`gallery-card${active ? ' active' : ''}`}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => navigate('/gallery')}
            aria-pressed={active}
            aria-label={alt}
          >
            <img src={item.src} alt={alt} loading="lazy" />
            <span className="gallery-shade" aria-hidden="true" />
            <span className="gallery-body">
              <span className="gallery-chip">{t(item.category_fr, item.category_ar)}</span>
              <span className="gallery-title">{t(item.title_fr, item.title_ar)}</span>
              <span
                className="gallery-cta"
                role="link"
                tabIndex={active ? 0 : -1}
                onClick={(event) => {
                  event.stopPropagation();
                  navigate('/gallery');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    navigate('/gallery');
                  }
                }}
              >
                {t('Découvrir', 'اكتشفي')}
                <ArrowUpRight className="gallery-arrow" aria-hidden="true" />
              </span>
            </span>
            <span className="gallery-rail" aria-hidden="true">
              <span className="gallery-rail-title">{t(item.title_fr, item.title_ar)}</span>
              <span className="gallery-rail-id">{item.id}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}