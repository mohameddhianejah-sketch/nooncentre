import { useEffect, useState } from 'react';
import { api } from '../../../api';

const empty = { title_fr: '', title_ar: '', description_fr: '', description_ar: '', image_url: '', is_active: true, order: 0 };

function formDataFor(data) {
  const body = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'image' && value !== undefined && value !== null) body.append(key, value);
  });
  if (data.image) body.append('image', data.image);
  return body;
}

export default function GalleryPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  function load() { setLoading(true); api.getGallery().then((data) => { setItems(data); setLoading(false); }).catch(() => setLoading(false)); }
  useEffect(load, []);
  async function save(e) { e.preventDefault(); const body = formDataFor(modal.data); if (modal.mode === 'new') await api.createGallery(body); else await api.updateGallery(modal.data.id, body); setModal(null); load(); }
  async function remove(id) { if (!window.confirm('Supprimer cette photo ?')) return; await api.deleteGallery(id); load(); }

  return <>
    <div className="admin-toolbar"><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Galerie photos</h3><button className="btn btn-solid btn-sm" onClick={() => setModal({ mode: 'new', data: { ...empty, order: items.length } })}>+ Nouvelle photo</button></div>
    <div className="admin-table-wrap">{loading ? <div className="loading-state">Chargement...</div> : items.length === 0 ? <div className="empty-state">Aucune photo.</div> : <table className="admin-table"><thead><tr><th>Aperçu</th><th>Titre</th><th>Actif</th><th></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><img src={item.photo_url || item.image_url} alt="" style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 5 }} /></td><td>{item.title_fr || 'Sans titre'}</td><td>{item.is_active ? '✓' : '—'}</td><td><button className="icon-btn edit" onClick={() => setModal({ mode: 'edit', data: { ...item, image: null } })}>✎</button><button className="icon-btn" onClick={() => remove(item.id)}>✕</button></td></tr>)}</tbody></table>}</div>
    {modal && <div className="modal-overlay" onClick={() => setModal(null)}><div className="modal-card" onClick={(e) => e.stopPropagation()}><h3>{modal.mode === 'new' ? 'Nouvelle photo' : 'Modifier la photo'}</h3><form onSubmit={save}>
      <div className="form-row"><label>Photo</label><input type="file" accept="image/*" onChange={(e) => setModal({ ...modal, data: { ...modal.data, image: e.target.files[0] } })} /></div>
      <div className="form-row"><label>URL de secours (optionnelle)</label><input value={modal.data.image_url || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, image_url: e.target.value } })} placeholder="/photos/visage.jpg" /></div>
      <div className="form-two"><div className="form-row"><label>Titre (FR)</label><input value={modal.data.title_fr} onChange={(e) => setModal({ ...modal, data: { ...modal.data, title_fr: e.target.value } })} /></div><div className="form-row"><label>العنوان (AR)</label><input value={modal.data.title_ar} onChange={(e) => setModal({ ...modal, data: { ...modal.data, title_ar: e.target.value } })} /></div></div>
      <div className="form-row"><label>Description (FR)</label><textarea value={modal.data.description_fr} onChange={(e) => setModal({ ...modal, data: { ...modal.data, description_fr: e.target.value } })} /></div><div className="form-row"><label>الوصف (AR)</label><textarea value={modal.data.description_ar} onChange={(e) => setModal({ ...modal, data: { ...modal.data, description_ar: e.target.value } })} /></div>
      <div className="form-two"><div className="form-row"><label>Ordre</label><input type="number" value={modal.data.order} onChange={(e) => setModal({ ...modal, data: { ...modal.data, order: e.target.value } })} /></div><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem' }}><input type="checkbox" checked={modal.data.is_active} onChange={(e) => setModal({ ...modal, data: { ...modal.data, is_active: e.target.checked } })} /> Actif</label></div>
      <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Annuler</button><button type="submit" className="btn btn-solid">Enregistrer</button></div>
    </form></div></div>}
  </>;
}