import { useEffect, useState } from 'react';
import { useLang } from '../context/LangContext';
import { api } from '../api';
import { GalleryProvider, GalleryImage } from '../components/GalleryLightbox';
import './gallery.css';

export default function Gallery() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGallery().then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);

  return (
    <GalleryProvider>
      <main className="gallery-page">
        <section className="gallery-intro"><div className="section-inner">
          <div className="kicker">{t('L’univers NOON', 'عالم نون')}</div>
          <h1>{t('Découvrez notre espace et nos soins', 'اكتشفي فضاءنا وعناياتنا')}</h1>
          <p>{t('Quelques images de l’expérience NOON, imaginée pour vous offrir un moment de beauté et de sérénité.', 'صور من تجربة نون، صُمّمت لتمنحك لحظة من الجمال والهدوء.')}</p>
        </div></section>
        <section className="gallery-main"><div className="section-inner">
          {loading && <p>{t('Chargement...', 'جاري التحميل...')}</p>}
          {!loading && items.length === 0 && <p className="gallery-empty">{t('La galerie sera bientôt enrichie.', 'سيتم إثراء المعرض قريباً.')}</p>}
          {!loading && items.length > 0 && <div className="gallery-grid">
            {items.map((item) => <GalleryImage
              key={item.id}
              id={item.id}
              src={item.photo_url || item.image_url}
              alt={t(item.title_fr || 'NOON Center', item.title_ar || 'مركز نون')}
              title={t(item.title_fr || '', item.title_ar || '')}
              description={t(item.description_fr || '', item.description_ar || '')}
            />)}
          </div>}
        </div></section>
      </main>
    </GalleryProvider>
  );
}