import { useEffect, useState } from 'react';
import { api } from '../../../api';

const STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  done: 'Terminé',
};

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const WEEKDAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function parseDate(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(value));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toKey(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function BookingsPanel() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('calendar');
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(null);
  const [dayKey, setDayKey] = useState(null);

  function load() {
    setLoading(true);
    api.getBookings().then((data) => { setBookings(data); setLoading(false); }).catch(() => setLoading(false));
  }

  useEffect(load, []);

  async function updateStatus(id, status) {
    setBookings(bookings.map((b) => (b.id === id ? { ...b, status } : b)));
    if (selected?.id === id) setSelected({ ...selected, status });
    try {
      await api.updateBooking(id, { status });
    } catch {
      load();
    }
  }

  async function remove(id) {
    if (!window.confirm('Supprimer cette réservation ?')) return;
    await api.deleteBooking(id);
    setBookings(bookings.filter((b) => b.id !== id));
    setSelected(null);
  }

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  // ---- Calendar helpers ----
  const cells = (() => {
    const year = cursor.getFullYear();
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday = 0
    const start = new Date(year, first.getMonth(), 1 - offset);
    const out = [];
    for (let i = 0; i < 42; i++) out.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    return out;
  })();

  const byDate = {};
  for (const b of filtered) {
    if (b.preferred_date) (byDate[b.preferred_date] = byDate[b.preferred_date] || []).push(b);
  }

  function moveMonth(delta) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }

  const todayKey = toKey(new Date());
  const monthLabel = `${MONTHS_FR[cursor.getMonth()]} ${cursor.getFullYear()}`;

  return (
    <>
      <div className="admin-toolbar">
        <div className="cal-switch">
          <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Calendrier</button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Liste</button>
        </div>

        {view === 'calendar' && (
          <div className="cal-nav2">
            <button onClick={() => moveMonth(-1)} title="Mois précédent">‹</button>
            <span>{monthLabel}</span>
            <button onClick={() => moveMonth(1)} title="Mois suivant">›</button>
            <button className="cal-today-btn" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>
              Aujourd'hui
            </button>
          </div>
        )}

        <div className="svc-tabs" style={{ marginBottom: 0 }}>
          {['all', 'pending', 'confirmed', 'done', 'cancelled'].map((f) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Toutes' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="loading-state">Chargement...</div>}

      {!loading && view === 'calendar' && (
        <div className="cal-wrap">
          <div className="cal-head">
            {WEEKDAYS_FR.map((wd) => <span key={wd}>{wd}</span>)}
          </div>
          <div className="cal-grid">
            {cells.map((d, i) => {
              const key = toKey(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = key === todayKey;
              const dayBookings = (byDate[key] || []).slice().sort((a, b) =>
                (a.preferred_time || '99').localeCompare(b.preferred_time || '99')
              );
              const visible = dayBookings.slice(0, 3);
              const extra = dayBookings.length - visible.length;
              return (
                <div
                  key={i}
                  className={`cal-day${inMonth ? '' : ' cal-muted'}${isToday ? ' cal-today' : ''}${dayBookings.length ? ' has-bookings' : ''}`}
                  onClick={() => setDayKey(key)}
                >
                  <div className="cal-day-num">{d.getDate()}</div>
                  {visible.map((b) => (
                    <button
                      key={b.id}
                      className={`cal-booking st-${b.status}`}
                      onClick={(e) => { e.stopPropagation(); setSelected(b); }}
                      title={`${b.name} — ${b.service_label || ''}`}
                    >
                      <span className="cal-time">{b.preferred_time ? b.preferred_time.slice(0, 5) : '—'}</span>
                      <span className="cal-name">{b.name}</span>
                    </button>
                  ))}
                  {extra > 0 && (
                    <button className="cal-more" onClick={(e) => { e.stopPropagation(); setDayKey(key); }}>
                      +{extra} autres
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && view === 'list' && (
        <div className="admin-table-wrap">
          {filtered.length === 0 ? (
            <div className="empty-state">Aucune réservation.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Téléphone</th>
                  <th>Service</th>
                  <th>Date / Heure</th>
                  <th>Statut</th>
                  <th>Reçu le</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td><a href={`tel:${b.phone}`}>{b.phone}</a></td>
                    <td>{b.service_label || b.service_name || '—'}</td>
                    <td>{b.preferred_date || '—'} {b.preferred_time ? b.preferred_time.slice(0, 5) : ''}</td>
                    <td>
                      <select
                        className="status-select"
                        value={b.status}
                        onChange={(e) => updateStatus(b.id, e.target.value)}
                      >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td>{b.created_at ? new Date(b.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>
                      <button className="icon-btn" title="Supprimer" onClick={() => remove(b.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {dayKey && (() => {
        const list = (byDate[dayKey] || []).slice().sort((a, b) =>
          (a.preferred_time || '99').localeCompare(b.preferred_time || '99')
        );
        const dayDate = parseDate(dayKey);
        const dayLabel = dayDate
          ? dayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          : dayKey;
        return (
          <div className="alert-overlay" onClick={() => setDayKey(null)}>
            <div className="cal-detail cal-day-detail" onClick={(e) => e.stopPropagation()}>
              <h4>{dayLabel}</h4>
              {list.length === 0 ? (
                <div className="cal-detail-row" style={{ marginBottom: 0 }}>
                  Aucune réservation ce jour.
                </div>
              ) : (
                <div className="day-bk-list">
                  {list.map((b) => (
                    <div key={b.id} className="day-bk">
                      <div className="day-bk-head">
                        <span className={`day-bk-time st-${b.status}`}>
                          {b.preferred_time ? b.preferred_time.slice(0, 5) : '—'}
                        </span>
                        <div>
                          <div className="day-bk-name">{b.name}</div>
                          <div className="day-bk-phone">{b.phone}</div>
                        </div>
                        <span className="day-bk-status">{STATUS_LABELS[b.status] || b.status}</span>
                      </div>
                      {b.service_label && (
                        <div className="day-bk-service">{b.service_label}</div>
                      )}
                      {b.category_times && Object.keys(b.category_times).length > 0 && (
                        <div className="day-bk-times">
                          {Object.entries(b.category_times).map(([slug, t]) => `${slug}: ${t || '—'}`).join(' · ')}
                        </div>
                      )}
                      {b.message && (
                        <div className="day-bk-msg">{b.message}</div>
                      )}
                      <div className="day-bk-foot">
                        <select
                          className="status-select"
                          value={b.status}
                          onChange={(e) => updateStatus(b.id, e.target.value)}
                        >
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <button className="icon-btn" title="Supprimer" onClick={() => remove(b.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="cal-detail-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setDayKey(null)}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {selected && (
        <div className="alert-overlay" onClick={() => setSelected(null)}>
          <div className="cal-detail" onClick={(e) => e.stopPropagation()}>
            <h4>
              {selected.name}
              <span>{selected.phone}</span>
            </h4>
            <div className="cal-detail-row">
              <b>Service :</b> {selected.service_label || '—'}
            </div>
            <div className="cal-detail-row">
              <b>Date :</b> {selected.preferred_date ? parseDate(selected.preferred_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}{' '}
              {selected.preferred_time ? `à ${selected.preferred_time.slice(0, 5)}` : ''}
            </div>
            {selected.category_times && Object.keys(selected.category_times).length > 0 && (
              <div className="cal-detail-row">
                <b>Horaires :</b>{' '}
                {Object.entries(selected.category_times).map(([slug, t]) => `${slug}: ${t || '—'}`).join(' · ')}
              </div>
            )}
            {selected.message && (
              <div className="cal-detail-row">
                <b>Message :</b> {selected.message}
              </div>
            )}
            <div className="cal-detail-row">
              <b>Statut :</b>{' '}
              <select
                className="status-select"
                value={selected.status}
                onChange={(e) => updateStatus(selected.id, e.target.value)}
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="cal-detail-actions">
              <button className="btn btn-danger btn-sm" onClick={() => remove(selected.id)}>
                Supprimer
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}