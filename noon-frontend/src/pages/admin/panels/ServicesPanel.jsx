import { useEffect, useState } from 'react';
import { api } from '../../../api';

const emptyService = {
  name_fr: '', name_ar: '', description_fr: '', description_ar: '',
  price_tnd: '', old_price_tnd: '', price_is_from: false, duration_minutes: 30,
  category: '', is_package: false, is_active: true, order: 0,
};

export default function ServicesPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode: 'new'|'edit', data }
  const [catModal, setCatModal] = useState(null);

  function load() {
    setLoading(true);
    api.getCategories().then((data) => { setCategories(data); setLoading(false); }).catch(() => setLoading(false));
  }
  useEffect(load, []);

  const allServices = categories.flatMap((c) => c.services.map((s) => ({ ...s, categoryObj: c })));

  async function saveService(e) {
    e.preventDefault();
    const payload = { ...modal.data, price_tnd: modal.data.price_tnd || 0, old_price_tnd: modal.data.old_price_tnd || null };
    if (modal.mode === 'new') await api.createService(payload);
    else await api.updateService(modal.data.id, payload);
    setModal(null);
    load();
  }

  async function deleteService(id) {
    if (!window.confirm('Supprimer ce service ?')) return;
    await api.deleteService(id);
    load();
  }

  async function saveCategory(e) {
    e.preventDefault();
    if (catModal.mode === 'new') await api.createCategory(catModal.data);
    else await api.updateCategory(catModal.data.id, catModal.data);
    setCatModal(null);
    load();
  }

  async function deleteCategory(id) {
    if (!window.confirm('Supprimer cette catégorie et tous ses services ?')) return;
    await api.deleteCategory(id);
    load();
  }

  return (
    <>
      <div className="admin-toolbar">
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Catégories</h3>
        <button className="btn btn-solid btn-sm" onClick={() => setCatModal({ mode: 'new', data: { name_fr: '', name_ar: '', description_fr: '', description_ar: '', slug: '', order: categories.length, capacity: 1, duration_minutes: 60 } })}>
          + Nouvelle catégorie
        </button>
      </div>
      <div className="admin-table-wrap" style={{ marginBottom: 30 }}>
        <table className="admin-table">
          <thead><tr><th>FR</th><th>AR</th><th>Description</th><th>Slug</th><th>Durée (min)</th><th></th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name_fr}</td>
                <td>{c.name_ar}</td>
                <td>{c.description_fr || c.description_ar || <em>—</em>}</td>
                <td>{c.slug}</td>
                <td>{c.duration_minutes ?? 60}</td>
                <td>
                  <button className="icon-btn edit" onClick={() => setCatModal({ mode: 'edit', data: c })}>✎</button>
                  <button className="icon-btn" onClick={() => deleteCategory(c.id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-toolbar">
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Services</h3>
        <button
          className="btn btn-solid btn-sm"
          onClick={() => setModal({ mode: 'new', data: { ...emptyService, category: categories[0]?.id || '' } })}
          disabled={categories.length === 0}
        >
          + Nouveau service
        </button>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="loading-state">Chargement...</div>
        ) : allServices.length === 0 ? (
          <div className="empty-state">Aucun service. Créez d'abord une catégorie.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Nom</th><th>Catégorie</th><th>Prix (TND)</th><th>Durée</th><th>Forfait</th><th>Actif</th><th></th></tr>
            </thead>
            <tbody>
              {allServices.map((s) => (
                <tr key={s.id}>
                  <td>{s.name_fr}</td>
                  <td>{s.categoryObj.name_fr}</td>
                  <td>{s.price_is_from ? 'à partir de ' : ''}{s.price_tnd}{s.old_price_tnd ? ` (au lieu de ${s.old_price_tnd})` : ''}</td>
                  <td>{s.duration_minutes} min</td>
                  <td>{s.is_package ? 'Oui' : '—'}</td>
                  <td>{s.is_active ? '✓' : '—'}</td>
                  <td>
                    <button className="icon-btn edit" onClick={() => setModal({ mode: 'edit', data: { ...s, category: s.category } })}>✎</button>
                    <button className="icon-btn" onClick={() => deleteService(s.id)}>✕</button>
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
            <h3>{modal.mode === 'new' ? 'Nouveau service' : 'Modifier le service'}</h3>
            <form onSubmit={saveService}>
              <div className="form-two">
                <div className="form-row"><label>Nom (FR)</label><input required value={modal.data.name_fr} onChange={(e) => setModal({ ...modal, data: { ...modal.data, name_fr: e.target.value } })} /></div>
                <div className="form-row"><label>الاسم (AR)</label><input required value={modal.data.name_ar} onChange={(e) => setModal({ ...modal, data: { ...modal.data, name_ar: e.target.value } })} /></div>
              </div>
              <div className="form-row">
                <label>Catégorie</label>
                <select value={modal.data.category} onChange={(e) => setModal({ ...modal, data: { ...modal.data, category: e.target.value } })}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
                </select>
              </div>
              <div className="form-two">
                <div className="form-row"><label>Description (FR)</label><input value={modal.data.description_fr || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, description_fr: e.target.value } })} /></div>
                <div className="form-row"><label>الوصف (AR)</label><input value={modal.data.description_ar || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, description_ar: e.target.value } })} /></div>
              </div>
              <div className="form-two">
                <div className="form-row"><label>Prix (TND)</label><input type="number" step="0.01" required value={modal.data.price_tnd} onChange={(e) => setModal({ ...modal, data: { ...modal.data, price_tnd: e.target.value } })} /></div>
                <div className="form-row"><label>Ancien prix (optionnel)</label><input type="number" step="0.01" value={modal.data.old_price_tnd || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, old_price_tnd: e.target.value } })} /></div>
              </div>
              <div className="form-two">
                <div className="form-row"><label>Durée (minutes)</label><input type="number" min="1" required value={modal.data.duration_minutes ?? 30} onChange={(e) => setModal({ ...modal, data: { ...modal.data, duration_minutes: e.target.value } })} /></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem' }}>
                  <input type="checkbox" checked={!!modal.data.price_is_from} onChange={(e) => setModal({ ...modal, data: { ...modal.data, price_is_from: e.target.checked } })} /> Prix « à partir de »
                </label>
              </div>
              <div className="form-two">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem' }}>
                  <input type="checkbox" checked={modal.data.is_package} onChange={(e) => setModal({ ...modal, data: { ...modal.data, is_package: e.target.checked } })} /> Forfait / package
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem' }}>
                  <input type="checkbox" checked={modal.data.is_active} onChange={(e) => setModal({ ...modal, data: { ...modal.data, is_active: e.target.checked } })} /> Actif (visible sur le site)
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Annuler</button>
                <button type="submit" className="btn btn-solid">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {catModal && (
        <div className="modal-overlay" onClick={() => setCatModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{catModal.mode === 'new' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}</h3>
            <form onSubmit={saveCategory}>
              <div className="form-row"><label>Nom (FR)</label><input required value={catModal.data.name_fr} onChange={(e) => setCatModal({ ...catModal, data: { ...catModal.data, name_fr: e.target.value } })} /></div>
              <div className="form-row"><label>الاسم (AR)</label><input required value={catModal.data.name_ar} onChange={(e) => setCatModal({ ...catModal, data: { ...catModal.data, name_ar: e.target.value } })} /></div>
              <div className="form-two">
                <div className="form-row"><label>Description (FR)</label><textarea value={catModal.data.description_fr || ''} onChange={(e) => setCatModal({ ...catModal, data: { ...catModal.data, description_fr: e.target.value } })} /></div>
                <div className="form-row"><label>الوصف (AR)</label><textarea value={catModal.data.description_ar || ''} onChange={(e) => setCatModal({ ...catModal, data: { ...catModal.data, description_ar: e.target.value } })} /></div>
              </div>
              <div className="form-row"><label>Slug (identifiant unique, ex: visage)</label><input required value={catModal.data.slug} onChange={(e) => setCatModal({ ...catModal, data: { ...catModal.data, slug: e.target.value } })} /></div>
              <div className="form-two">
                <div className="form-row"><label>Capacité / créneau</label><input type="number" min="1" required value={catModal.data.capacity} onChange={(e) => setCatModal({ ...catModal, data: { ...catModal.data, capacity: e.target.value } })} /></div>
                <div className="form-row"><label>Durée d'un soin (min)</label><input type="number" min="5" step="5" required value={catModal.data.duration_minutes} onChange={(e) => setCatModal({ ...catModal, data: { ...catModal.data, duration_minutes: e.target.value } })} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setCatModal(null)}>Annuler</button>
                <button type="submit" className="btn btn-solid">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
