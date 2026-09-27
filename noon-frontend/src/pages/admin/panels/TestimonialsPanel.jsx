import { useEffect, useState } from 'react';
import { api } from '../../../api';

const empty = { author_fr: 'Cliente NOON Center', author_ar: 'زبونة مركز NOON', text_fr: '', text_ar: '', rating: 5, is_active: true, order: 0 };

export default function TestimonialsPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  function load() {
    setLoading(true);
    // staff sees all incl. inactive because the viewset filters by is_staff
    api.getAdminTestimonials().then((data) => { setItems(data); setLoading(false); }).catch(() => setLoading(false));
  }
  useEffect(load, []);

  async function save(e) {
    e.preventDefault();
    if (modal.mode === 'new') await api.createTestimonial(modal.data);
    else await api.updateTestimonial(modal.data.id, modal.data);
    setModal(null);
    load();
  }

  async function remove(id) {
    if (!window.confirm('Supprimer ce témoignage ?')) return;
    await api.deleteTestimonial(id);
    load();
  }

  return (
    <>
      <div className="admin-toolbar">
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Témoignages</h3>
        <button className="btn btn-solid btn-sm" onClick={() => setModal({ mode: 'new', data: { ...empty, order: items.length } })}>
          + Nouveau témoignage
        </button>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="loading-state">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">Aucun témoignage.</div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Texte (FR)</th><th>Auteur</th><th>Note</th><th>Actif</th><th></th></tr></thead>
            <tbody>
              {items.map((tm) => (
                <tr key={tm.id}>
                  <td>{tm.text_fr.slice(0, 60)}{tm.text_fr.length > 60 ? '…' : ''}</td>
                  <td>{tm.client_name || tm.author_fr}</td>
                  <td>{tm.rating}/5</td>
                  <td>{tm.is_active ? '✓' : '—'}</td>
                  <td>
                    <button className="icon-btn edit" onClick={() => setModal({ mode: 'edit', data: tm })}>✎</button>
                    <button className="icon-btn" onClick={() => remove(tm.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{modal.mode === 'new' ? 'Nouveau témoignage' : 'Modifier le témoignage'}</h3>
            <form onSubmit={save}>
              <div className="form-row"><label>Texte (FR)</label><textarea required value={modal.data.text_fr} onChange={(e) => setModal({ ...modal, data: { ...modal.data, text_fr: e.target.value } })} /></div>
              <div className="form-row"><label>النص (AR)</label><textarea required value={modal.data.text_ar} onChange={(e) => setModal({ ...modal, data: { ...modal.data, text_ar: e.target.value } })} /></div>
              <div className="form-two">
                <div className="form-row"><label>Auteur (FR)</label><input value={modal.data.author_fr} onChange={(e) => setModal({ ...modal, data: { ...modal.data, author_fr: e.target.value } })} /></div>
                <div className="form-row"><label>الكاتبة (AR)</label><input value={modal.data.author_ar} onChange={(e) => setModal({ ...modal, data: { ...modal.data, author_ar: e.target.value } })} /></div>
              </div>
              <div className="form-row"><label>Note (1 à 5)</label><input type="number" min="1" max="5" value={modal.data.rating} onChange={(e) => setModal({ ...modal, data: { ...modal.data, rating: e.target.value } })} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', marginBottom: 10 }}>
                <input type="checkbox" checked={modal.data.is_active} onChange={(e) => setModal({ ...modal, data: { ...modal.data, is_active: e.target.checked } })} /> Actif (visible sur le site)
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Annuler</button>
                <button type="submit" className="btn btn-solid">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
