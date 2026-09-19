import { useState } from 'react';
import { useLang } from '../context/LangContext';

function initialsOf(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function nameOf(tm, t) {
  return tm.client_name || t(tm.author_fr, tm.author_ar);
}

export default function Testimonials({ testimonials = [], initialActive = 0 }) {
  const { t } = useLang();
  const [activeIndex, setActiveIndex] = useState(initialActive);
  const [displayIndex, setDisplayIndex] = useState(initialActive);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (testimonials.length === 0) return null;

  const activeIdx = Math.min(activeIndex, testimonials.length - 1);
  const shown = testimonials[Math.min(displayIndex, testimonials.length - 1)];

  const handleSelect = (index) => {
    if (index === activeIdx || isAnimating) return;
    setIsAnimating(true);
    window.setTimeout(() => {
      setDisplayIndex(index);
      setActiveIndex(index);
      window.setTimeout(() => setIsAnimating(false), 320);
    }, 200);
  };

  return (
    <div className={`tm${isAnimating ? ' tm-swap' : ''}`}>
      <div className="tm-quote-wrap">
        <span className="tm-quote-mark" aria-hidden="true">&ldquo;</span>
        <p className="tm-quote">{t(shown.text_fr, shown.text_ar)}</p>
      </div>

      <div className="tm-meta">
        <span className="tm-stars" aria-label={`${shown.rating || 5} sur 5`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={star <= (shown.rating || 5) ? 'filled' : ''} aria-hidden="true">★</span>
          ))}
        </span>
      </div>

      <div className="tm-row">
        {testimonials.map((tm, index) => {
          const active = index === activeIdx;
          const hovered = hoveredIndex === index && !active;
          const name = nameOf(tm, t);
          return (
            <button
              key={tm.id}
              type="button"
              className={`tm-pill${active ? ' active' : ''}${active || hovered ? ' show-name' : ''}`}
              onClick={() => handleSelect(index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              aria-pressed={active}
              aria-label={`${t('Avis de', 'رأي')} ${name}`}
            >
              <span className="tm-avatar">
                {tm.client_photo_url ? (
                  <img src={tm.client_photo_url} alt={name} />
                ) : (
                  <span className="tm-avatar-fallback" aria-hidden="true">
                    {initialsOf(name)}
                  </span>
                )}
              </span>
              <span className="tm-pill-name">
                <span className="tm-pill-name-inner">{name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}