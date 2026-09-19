import { useEffect, useState } from 'react';
import { api } from '../../../api';

export default function SettingsPanel() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(setData);
  }, []);

  function update(field, value) {
    setData({ ...data, [field]: value });
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateSettings(data);
      setData(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <div className="loading-state">Chargement...</div>;

  return (
    <form onSubmit={handleSave} className="form-card" style={{ maxWidth: 640 }}>
      {saved && <div className="form-success">Paramètres enregistrés.</div>}

      <div className="form-row"><label>Nom du site</label><input value={data.site_name} onChange={(e) => update('site_name', e.target.value)} /></div>

      <div className="form-two">
        <div className="form-row"><label>Slogan (FR)</label><input value={data.tagline_fr} onChange={(e) => update('tagline_fr', e.target.value)} /></div>
        <div className="form-row"><label>الشعار (AR)</label><input value={data.tagline_ar} onChange={(e) => update('tagline_ar', e.target.value)} /></div>
      </div>

      <div className="form-row"><label>À propos (FR)</label><textarea rows={4} value={data.about_fr} onChange={(e) => update('about_fr', e.target.value)} /></div>
      <div className="form-row"><label>من نحن (AR)</label><textarea rows={4} value={data.about_ar} onChange={(e) => update('about_ar', e.target.value)} /></div>

      <div className="form-two">
        <div className="form-row"><label>Fondatrice</label><input value={data.founder_name} onChange={(e) => update('founder_name', e.target.value)} /></div>
        <div className="form-row"><label>Année de création</label><input type="number" value={data.founded_year} onChange={(e) => update('founded_year', e.target.value)} /></div>
      </div>

      <div className="form-row"><label>Adresse (FR)</label><input value={data.address_fr} onChange={(e) => update('address_fr', e.target.value)} /></div>
      <div className="form-row"><label>العنوان (AR)</label><input value={data.address_ar} onChange={(e) => update('address_ar', e.target.value)} /></div>

      <div className="form-two">
        <div className="form-row"><label>Téléphone</label><input value={data.phone} onChange={(e) => update('phone', e.target.value)} /></div>
        <div className="form-row"><label>WhatsApp</label><input value={data.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} /></div>
      </div>

      <div className="form-row"><label>Lien Facebook</label><input value={data.facebook_url} onChange={(e) => update('facebook_url', e.target.value)} /></div>
      <div className="form-row"><label>Requête carte (adresse pour Google Maps)</label><input value={data.map_query} onChange={(e) => update('map_query', e.target.value)} /></div>

      <div className="form-two">
        <div className="form-row"><label>Latitude (carte interactive)</label><input inputMode="decimal" step="any" value={data.latitude ?? ''} onChange={(e) => update('latitude', e.target.value)} placeholder="36.724800" /></div>
        <div className="form-row"><label>Longitude (carte interactive)</label><input inputMode="decimal" step="any" value={data.longitude ?? ''} onChange={(e) => update('longitude', e.target.value)} placeholder="10.292000" /></div>
      </div>

      <button type="submit" className="btn btn-solid" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</button>
    </form>
  );
}
