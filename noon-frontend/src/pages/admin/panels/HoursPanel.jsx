import { useEffect, useState } from 'react';
import { api } from '../../../api';

const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function HoursPanel() {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  function load() {
    setLoading(true);
    api.getHours().then((data) => { setHours(data.sort((a, b) => a.weekday - b.weekday)); setLoading(false); }).catch(() => setLoading(false));
  }
  useEffect(load, []);

  function updateLocal(id, field, value) {
    setHours(hours.map((h) => (h.id === id ? { ...h, [field]: value } : h)));
  }

  async function save(h) {
    setSaving(h.id);
    try {
      await api.updateHour(h.id, {
        is_closed: h.is_closed,
        open_time: h.is_closed ? null : h.open_time,
        close_time: h.is_closed ? null : h.close_time,
      });
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="loading-state">Chargement...</div>;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Jour</th><th>Fermé</th><th>Ouverture</th><th>Fermeture</th><th></th></tr></thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h.id}>
              <td>{DAY_LABELS[h.weekday]}</td>
              <td>
                <input type="checkbox" checked={h.is_closed} onChange={(e) => updateLocal(h.id, 'is_closed', e.target.checked)} />
              </td>
              <td>
                <input type="time" disabled={h.is_closed} value={h.is_closed ? '' : (h.open_time || '').slice(0, 5)}
                  onChange={(e) => updateLocal(h.id, 'open_time', e.target.value)} />
              </td>
              <td>
                <input type="time" disabled={h.is_closed} value={h.is_closed ? '' : (h.close_time || '').slice(0, 5)}
                  onChange={(e) => updateLocal(h.id, 'close_time', e.target.value)} />
              </td>
              <td>
                <button className="btn btn-solid btn-sm" onClick={() => save(h)} disabled={saving === h.id}>
                  {saving === h.id ? '...' : 'Enregistrer'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
