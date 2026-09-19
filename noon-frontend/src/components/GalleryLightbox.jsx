import { createContext, useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { X } from 'lucide-react';

const LightboxContext = createContext(null);

const spring = { type: 'spring', stiffness: 350, damping: 35, mass: 1 };

export function GalleryProvider({ children }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [selected]);

  return (
    <LightboxContext.Provider value={{ selected, setSelected }}>
      <MotionConfig reducedMotion="user">
        {children}
        <LightboxModal />
      </MotionConfig>
    </LightboxContext.Provider>
  );
}

export function GalleryImage({ id, src, alt, title, description }) {
  const { setSelected } = useContext(LightboxContext);

  const open = () => setSelected({ id, src, alt, title, description });

  return (
    <article
      className="gallery-card"
      role="button"
      tabIndex={0}
      aria-label={alt || 'Galerie'}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      }}
    >
      <div className="gallery-photo">
        <motion.img
          layoutId={`gallery-image-${id}`}
          src={src}
          alt={alt || 'Galerie NOON Center'}
          loading="lazy"
          transition={spring}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        />
      </div>
      <div className="gallery-caption">
        {title && <h2>{title}</h2>}
        {description && <p>{description}</p>}
      </div>
    </article>
  );
}

function LightboxModal() {
  const { selected, setSelected } = useContext(LightboxContext);

  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          className="lb-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={selected.alt || 'Galerie NOON Center'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => setSelected(null)}
        >
          <motion.div
            className="lb-stage"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.7}
            onDragEnd={(event, info) => {
              if (Math.abs(info.offset.y) > 110 || Math.abs(info.velocity.y) > 350) {
                setSelected(null);
              }
            }}
          >
            <motion.img
              layoutId={`gallery-image-${selected.id}`}
              src={selected.src}
              alt={selected.alt || 'Galerie NOON Center'}
              className="lb-image"
              transition={spring}
              draggable={false}
              onClick={(event) => event.stopPropagation()}
            />
            {(selected.title || selected.description) && (
              <div className="lb-caption">
                {selected.title && <h3>{selected.title}</h3>}
                {selected.description && <p>{selected.description}</p>}
              </div>
            )}
          </motion.div>

          <motion.button
            type="button"
            className="lb-close"
            autoFocus
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            onClick={() => setSelected(null)}
            aria-label="Fermer la galerie"
          >
            <X strokeWidth={2.2} aria-hidden="true" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}