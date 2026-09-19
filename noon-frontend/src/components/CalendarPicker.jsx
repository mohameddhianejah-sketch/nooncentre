import { useState } from 'react';

const MONTH_NAMES = {
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  ar: ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

const DAY_HEADERS = {
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  ar: ['إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت', 'أحد'],
};

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function CalendarPicker({ value, onChange, hours, lang }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(today);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const closedDays = new Set();
  if (hours && hours.length) {
    hours.forEach((h) => {
      if (h.is_closed) closedDays.add(h.weekday);
    });
  }

  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(<div key={`empty-${i}`} className="cal-cell cal-empty" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    dateObj.setHours(0, 0, 0, 0);
    const iso = toISO(year, month, d);
    const weekday = dateObj.getDay();
    const adjustedWeekday = weekday === 0 ? 6 : weekday - 1;
    const isPast = dateObj < today;
    const isClosed = closedDays.has(adjustedWeekday);
    const isSelected = value === iso;
    const isToday = dateObj.getTime() === today.getTime();
    const disabled = isPast || isClosed;

    let cls = 'cal-cell';
    if (isToday) cls += ' cal-today';
    if (isSelected) cls += ' cal-selected';
    if (disabled) cls += ' cal-disabled';
    else cls += ' cal-avail';

    cells.push(
      <div
        key={d}
        className={cls}
        onClick={disabled ? undefined : () => onChange(iso)}
        role={disabled ? undefined : 'button'}
        tabIndex={disabled ? undefined : 0}
      >
        {d}
      </div>
    );
  }

  const t = (fr, ar) => (lang === 'ar' ? ar : fr);

  return (
    <div className="cal-picker">
      <div className="cal-header">
        <button type="button" className="cal-nav" onClick={() => setViewDate(new Date(year, month - 1, 1))}>&lsaquo;</button>
        <span className="cal-title">{MONTH_NAMES[lang][month]} {year}</span>
        <button type="button" className="cal-nav" onClick={() => setViewDate(new Date(year, month + 1, 1))}>&rsaquo;</button>
      </div>
      <div className="cal-grid">
        {DAY_HEADERS[lang].map((dh) => (
          <div key={dh} className="cal-cell cal-dow">{dh}</div>
        ))}
        {cells}
      </div>
      {value && (
        <div className="cal-selected-label">
          {t('Sélectionné', 'مختار')}: {value}
        </div>
      )}
    </div>
  );
}
