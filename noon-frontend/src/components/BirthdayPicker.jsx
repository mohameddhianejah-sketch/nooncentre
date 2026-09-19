import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang } from '../context/LangContext';
import './BirthdayPicker.css';

const MONTHS = {
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  ar: ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

const WEEKDAYS = {
  fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  ar: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'],
};

const MIN_YEAR = 1900;

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

function clampDate(y, m, d) {
  const dim = new Date(y, m + 1, 0).getDate();
  return toISO(y, m, Math.max(1, Math.min(d, dim)));
}

export default function BirthdayPicker({ id, value, onChange, hasError, errorId }) {
  const { lang } = useLang();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isAr = lang === 'ar';

  const [open, setOpen] = useState(false);
  const [view, setView] = useState('month');
  const [viewY, setViewY] = useState(() => (value ? Number(value.slice(0, 4)) : today.getFullYear()));
  const [viewM, setViewM] = useState(() => (value ? Number(value.slice(5, 7)) - 1 : today.getMonth()));
  const [focusISO, setFocusISO] = useState(() => value || toISO(today.getFullYear(), today.getMonth(), today.getDate()));
  const rootRef = useRef(null);
  const gridRef = useRef(null);

  const selected = value || '';
  const placeholder = isAr ? 'اليوم، الشهر، السنة' : 'Jour, mois, année';
  const displayed = selected
    ? `${Number(selected.slice(8, 10))} ${MONTHS[lang][Number(selected.slice(5, 7)) - 1]} ${Number(selected.slice(0, 4))}`
    : placeholder;

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = gridRef.current && gridRef.current.querySelector(`[data-iso="${focusISO}"]`);
    if (el && typeof el.focus === 'function') el.focus({ preventScroll: true });
  }, [open, focusISO]);

  function toggleOpen() {
    setView('month');
    setFocusISO((prev) => {
      const { y, m, d } = parseISO(prev);
      if (y === viewY && m === viewM) return prev;
      return clampDate(viewY, viewM, d);
    });
    setOpen((o) => !o);
  }

  function keepFocusInView(ny, nm) {
    const { d } = parseISO(focusISO);
    setFocusISO(clampDate(ny, nm, d));
  }

  function close() {
    setOpen(false);
    if (rootRef.current) {
      const trig = rootRef.current.querySelector('.bp-trigger');
      if (trig && typeof trig.focus === 'function') trig.focus();
    }
  }

  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const startOffset = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
  const currentYear = today.getFullYear();

  function isDisabled(y, m, d) {
    return new Date(y, m, d) > today;
  }

  function pickDay(e, iso, y, m, d) {
    e.preventDefault();
    if (isDisabled(y, m, d)) return;
    onChange(iso);
    setOpen(false);
  }

  function handleGridKey(e) {
    const { y, m, d } = parseISO(focusISO);
    let ny = y;
    let nm = m;
    let nd = d;
    switch (e.key) {
      case 'ArrowLeft': nd -= 1; break;
      case 'ArrowRight': nd += 1; break;
      case 'ArrowUp': nd -= 7; break;
      case 'ArrowDown': nd += 7; break;
      case 'Home': nd = 1; break;
      case 'End': nd = daysInMonth; break;
      case 'PageUp': nm -= 1; break;
      case 'PageDown': nm += 1; break;
      case 'Escape': close(); e.preventDefault(); return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isDisabled(y, m, d)) onChange(toISO(y, m, d));
        return;
      default:
        return;
    }
    if (nm < 0) { nm = 11; ny -= 1; }
    if (nm > 11) { nm = 0; ny += 1; }
    const target = clampDate(ny, nm, nd);
    setViewY(ny);
    setViewM(nm);
    setFocusISO(target);
    e.preventDefault();
  }

  const days = [
    ...Array.from({ length: startOffset }, (_, i) => <span key={`empty-${i}`} />),
    ...Array.from({ length: daysInMonth }, (_, slot) => {
      const d = slot + 1;
      const iso = toISO(viewY, viewM, d);
      const cellDate = new Date(viewY, viewM, d);
      cellDate.setHours(0, 0, 0, 0);
      const disabled = isDisabled(viewY, viewM, d);
      const isToday = cellDate.getTime() === today.getTime();
      const isSelected = selected === iso;
      const isFocused = focusISO === iso;
      const cls = ['bp-day', isToday && 'is-today', isSelected && 'is-selected', disabled && 'is-disabled', isFocused && 'is-focus']
        .filter(Boolean)
        .join(' ');
      return (
        <button
          key={d}
          type="button"
          className={cls}
          data-iso={iso}
          tabIndex={isFocused ? 0 : -1}
          aria-disabled={disabled || undefined}
          aria-pressed={isSelected}
          aria-label={`${d} ${MONTHS[lang][viewM]} ${viewY}`}
          onClick={(e) => pickDay(e, iso, viewY, viewM, d)}
        >
          {d}
        </button>
      );
    }),
  ];

  const yearCount = currentYear - MIN_YEAR + 1;
  const years = Array.from({ length: yearCount }, (_, slot) => {
    const y = currentYear - slot;
    const isLive = y === currentYear;
    const isPicked = y === viewY;
    const cls = ['bp-year-btn', isLive ? 'is-live' : null, isPicked ? 'is-picked' : null]
      .filter(Boolean)
      .join(' ');
    return (
      <button
        key={y}
        type="button"
        className={cls}
        onClick={() => { setViewY(y); setView('month'); keepFocusInView(y, viewM); }}
      >
        {y}
        {isLive ? <span className="bp-live-dot" aria-hidden="true" /> : null}
      </button>
    );
  });

  function goMonth(delta) {
    let m = viewM + delta;
    let y = viewY;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewM(m);
    setViewY(y);
    keepFocusInView(y, m);
  }

  function goYearGroup(delta) {
    let y = viewY + delta;
    if (y < MIN_YEAR) y = MIN_YEAR;
    if (y > currentYear) y = currentYear;
    setViewY(y);
    keepFocusInView(y, viewM);
  }

  function jumpToday() {
    setViewY(today.getFullYear());
    setViewM(today.getMonth());
    setView('month');
    setFocusISO(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
  }

  return (
    <div className="birthday-picker" ref={rootRef}>
      <button
        type="button"
        id={id}
        className={`bp-trigger${hasError ? ' has-error' : ''}`}
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={hasError || undefined}
        aria-describedby={errorId}
      >
        <Calendar size={17} aria-hidden="true" />
        <span className={`bp-value${selected ? '' : ' is-placeholder'}`}>{displayed}</span>
        <ChevronDown size={16} className="bp-caret" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="bp-pop"
            className="bp-pop"
            role="dialog"
            aria-modal="false"
            aria-label={isAr ? 'اختيار تاريخ الميلاد' : 'Choisir la date de naissance'}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            <div className="bp-head">
              <button
                type="button"
                className="bp-chev"
                onClick={() => (view === 'month' ? goMonth(-1) : goYearGroup(-12))}
                aria-label={isAr ? 'السابق' : 'Précédent'}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="bp-title-btn"
                onClick={() => (view === 'month' ? setView('year') : setView('month'))}
              >
                {view === 'month'
                  ? `${MONTHS[lang][viewM]} ${viewY}`
                  : `${MIN_YEAR} – ${currentYear}`}
              </button>
              <button
                type="button"
                className="bp-chev"
                onClick={() => (view === 'month' ? goMonth(1) : goYearGroup(12))}
                aria-label={isAr ? 'التالي' : 'Suivant'}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>

            {view === 'month' ? (
              <>
                <div className="bp-week" aria-hidden="true">
                  {WEEKDAYS[lang].map((w) => <span key={w}>{w}</span>)}
                </div>
                <div
                  className="bp-grid"
                  role="grid"
                  ref={gridRef}
                  onKeyDown={handleGridKey}
                  aria-label={isAr ? 'شهور' : 'Mois'}
                >
                  {days}
                </div>
              </>
            ) : (
              <div className="bp-years">{years}</div>
            )}

            <div className="bp-actions">
              <button type="button" className="bp-action today" onClick={jumpToday}>
                {isAr ? 'اليوم' : "Aujourd'hui"}
              </button>
              <button
                type="button"
                className="bp-action clear"
                onClick={() => { onChange(''); setOpen(false); }}
                disabled={!selected}
              >
                {isAr ? 'مسح' : 'Effacer'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}