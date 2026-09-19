import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useSpring, AnimatePresence, useReducedMotion } from 'framer-motion';
import L from 'leaflet';
import { MapPin, Navigation, X, ChevronDown } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './LocationMapCard.css';

const TILE_PROVIDERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  carto: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
};

const COLLAPSED_HEIGHT = 230;
const MOBILE_EXPANDED_HEIGHT = 330;
const DESKTOP_EXPANDED_HEIGHT = 400;

const PIN_HTML =
  '<span class="loc-pin">' +
  '<svg width="24" height="32" viewBox="0 0 24 32" aria-hidden="true">' +
  '<path d="M12 1C6.8 1 2.5 5.3 2.5 10.8 2.5 19.8 12 31 12 31s9.5-11.2 9.5-20.2C21.5 5.3 17.2 1 12 1z"/>' +
  '<circle cx="12" cy="11" r="4.4" class="loc-pin-core"/>' +
  '</svg></span>';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatCoords(lat, lng) {
  const ns = lat < 0 ? 'S' : 'N';
  const ew = lng < 0 ? 'W' : 'E';
  return `${Math.abs(lat).toFixed(4)}° ${ns} · ${Math.abs(lng).toFixed(4)}° ${ew}`;
}

function responsiveExpandedHeight() {
  if (typeof window === 'undefined') return DESKTOP_EXPANDED_HEIGHT;
  return window.innerWidth < 560 ? MOBILE_EXPANDED_HEIGHT : DESKTOP_EXPANDED_HEIGHT;
}

export default function LocationMapCard({
  location = '',
  latitude = null,
  longitude = null,
  address = '',
  zoom = 15,
  mapProvider = 'osm',
  className = '',
  expandLabel = 'Open the map',
  collapseLabel = 'Close the map',
  directionsLabel = 'Itinéraire',
  detailsLabel = 'Location',
}) {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  const hasCoords = lat !== null && lng !== null;

  const cardRef = useRef(null);
  const mapDivRef = useRef(null);
  const coverRef = useRef(null);
  const closeRef = useRef(null);
  const mapInstance = useRef(null);
  const interacted = useRef(false);

  const [expanded, setExpanded] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(responsiveExpandedHeight);
  const reducedMotion = useReducedMotion();

  const rotateX = useSpring(0, { stiffness: 170, damping: 18, mass: 0.6 });
  const rotateY = useSpring(0, { stiffness: 170, damping: 18, mass: 0.6 });

  const tile = TILE_PROVIDERS[mapProvider] || TILE_PROVIDERS.osm;

  useEffect(() => {
    const onResize = () => {
      setExpandedHeight(responsiveExpandedHeight());
      mapInstance.current?.invalidateSize();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!hasCoords || !mapDivRef.current) return;
    const map = L.map(mapDivRef.current, {
      center: [lat, lng],
      zoom,
      zoomControl: true,
      attributionControl: { position: 'topright' },
      dragging: false,
      scrollWheelZoom: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    });
    L.tileLayer(tile.url, { attribution: tile.attribution, maxZoom: 19 }).addTo(map);
    const icon = L.divIcon({
      className: 'loc-pin-icon',
      html: PIN_HTML,
      iconSize: [24, 32],
      iconAnchor: [12, 32],
    });
    const marker = L.marker([lat, lng], { icon });
    if (location) marker.bindTooltip(location, { direction: 'top', offset: [0, -30] });
    marker.addTo(map);
    map.invalidateSize();
    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords, lat, lng, location, tile.url, tile.attribution, zoom]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (expanded) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.scrollWheelZoom.enable();
      window.setTimeout(() => map.invalidateSize(), 30);
      window.setTimeout(() => map.invalidateSize(), 600);
    } else {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      map.scrollWheelZoom.disable();
    }
  }, [expanded]);

  const expand = useCallback(() => {
    interacted.current = true;
    setExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    interacted.current = true;
    setExpanded(false);
  }, []);

  useEffect(() => {
    if (!interacted.current) return;
    if (expanded) closeRef.current?.focus();
    else coverRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => {
      if (e.key === 'Escape') collapse();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, collapse]);

  const resetTilt = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  const handlePointerMove = useCallback(
    (e) => {
      if (expanded || reducedMotion || !cardRef.current) {
        resetTilt();
        return;
      }
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      if (coarse) {
        resetTilt();
        return;
      }
      const rect = cardRef.current.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      rotateX.set((0.5 - py) * 7);
      rotateY.set((px - 0.5) * 9);
    },
    [expanded, reducedMotion, resetTilt, rotateX, rotateY]
  );

  const sizeTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.55, ease: [0.22, 1, 0.36, 1] };
  const bubbleTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.35, ease: [0.22, 1, 0.36, 1] };

  return (
    <div className="loc-card-wrap">
      <motion.div
        className={[
          'loc-card',
          expanded ? 'is-expanded' : 'is-collapsed',
          className,
        ].filter(Boolean).join(' ')}
        ref={cardRef}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
      >
        {!expanded && (
          <button
            type="button"
            className="loc-cover"
            ref={coverRef}
            onClick={expand}
            aria-expanded={false}
            aria-controls="loc-bubble"
            aria-label={expandLabel}
            title={expandLabel}
          />
        )}

        <motion.div
          className="loc-map-wrap"
          initial={false}
          animate={{ height: expanded ? expandedHeight : COLLAPSED_HEIGHT }}
          transition={sizeTransition}
        >
          {hasCoords ? (
            <div className="loc-map" ref={mapDivRef} aria-hidden={expanded ? undefined : 'true'} />
          ) : (
            <div className="loc-map-empty">
              <MapPin size={28} aria-hidden="true" />
              <span>Coordonnées non définies</span>
            </div>
          )}

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                id="loc-bubble"
                className="loc-bubble"
                role="region"
                aria-label={detailsLabel}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={bubbleTransition}
              >
                <button
                  type="button"
                  className="loc-bubble-close"
                  ref={closeRef}
                  onClick={collapse}
                  aria-label={collapseLabel}
                  title={collapseLabel}
                >
                  <X size={14} aria-hidden="true" />
                </button>
                <span className="loc-bubble-icon">
                  <MapPin size={16} aria-hidden="true" />
                </span>
                <span className="loc-bubble-text">
                  <span className="loc-bubble-kicker">{detailsLabel}</span>
                  <span className="loc-bubble-address">
                    {address || (hasCoords ? formatCoords(lat, lng) : location)}
                  </span>
                </span>
                {hasCoords && (
                  <a
                    className="loc-directions"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Navigation size={14} aria-hidden="true" />
                    <span>{directionsLabel}</span>
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="loc-info">
          <span className="loc-info-icon">
            <MapPin size={18} aria-hidden="true" />
          </span>
          <span className="loc-info-text">
            <span className="loc-name">{location}</span>
            <span className="loc-coords">
              {hasCoords ? formatCoords(lat, lng) : address || '—'}
            </span>
          </span>
          {expanded ? (
            <button
              type="button"
              className="loc-toggle is-open"
              onClick={collapse}
              aria-expanded
              aria-controls="loc-bubble"
              aria-label={collapseLabel}
            >
              <ChevronDown size={18} aria-hidden="true" />
            </button>
          ) : (
            <span className="loc-toggle-hint">
              <ChevronDown size={18} aria-hidden="true" />
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}