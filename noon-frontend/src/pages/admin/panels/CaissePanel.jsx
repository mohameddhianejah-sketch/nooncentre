import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { PAYMENT_LABELS, money } from '../../caisse/receipt';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const emptyCashier = { username: '', first_name: '', password: '' };

export default function CaissePanel() {
  const [day, setDay] = useState(todayIso);
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [form, setForm] = useState(emptyCashier);
  const [formError, setFormError] = useState('');
  const [resetFor, setResetFor] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [cancelFor, setCancelFor] = useState(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  function loadDay(d) {
    Promise.all([api.getAdminCaisseSummary(d), api.getAdminSales(d)])
      .then(([s, list]) => { setSummary(s); setSales(list); })
      .catch((e) => setMessage(e.message || 'Chargement impossible.'));
  }
  useEffect(() => { loadDay(day); }, [day]);
  useEffect(() => { api.getCashiers().then(setCashiers).catch(() => {}); }, []);

  async function createCashier(e) {
    e.preventDefault();
    setFormError('');
    try {
      const created = await api.createCashier(form);
      setCashiers((list) => [...list, created].sort((a, b) => a.username.localeCompare(b.username)));
      setForm(emptyCashier);
      setMessage(`Compte caisse « ${created.username} » créé.`);
    } catch (err) {
      const pw = err.data?.password;
      setFormError(Array.isArray(pw) ? pw.join(' ') : err.message);
    }
  }

  async function toggleActive(c) {
    const updated = await api.updateCashier(c.id, { is_active: !c.is_active });
    setCashiers((list) => list.map((x) => (x.id === c.id ? updated : x)));
  }

  async function savePassword() {
    try {
      await api.updateCashier(resetFor.id, { password: newPassword });
      setMessage(`Mot de passe de « ${resetFor.username} » modifié.`);
      setResetFor(null);
      setNewPassword('');
    } catch (err) {
      const pw = err.data?.password;
      setMessage(Array.isArray(pw) ? pw.join(' ') : err.message);
    }
  }

  async function confirmCancel() {
    try {
      const updated = await api.cancelAdminSale(cancelFor.id, reason.trim());
      setSales((list) => list.map((s) => (s.id === updated.id ? updated : s)));
      setCancelFor(null);
      setReason('');
      loadDay(day);
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div>
      {message && <div className="form-success" style={{ marginBottom: 18 }}>{message}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Ventes du</h3>
        <input type="date" value={day} max={todayIso()} onChange={(e) => e.target.value && setDay(e.target.value)} />
        <a className="btn btn-ghost btn-sm" href="/caisse" target="_blank" rel="noreferrer">Ouvrir la caisse ↗</a>
      </div>

      {summary && (
        <div className="stat-cards">
          <div className="stat-card"><b>{money(summary.total)}</b><span>Total encaissé</span></div>
          <div className="stat-card"><b>{money(summary.cash_total)}</b><span>Espèces</span></div>
          <div className="stat-card"><b>{money(summary.card_total)}</b><span>Carte</span></div>
          <div className="stat-card"><b>{summary.count}</b><span>Tickets</span></div>
          <div className="stat-card"><b>{money(summary.discount_total)}</b><span>Remises</span></div>
          <div className="stat-card"><b>{summary.cancelled_count}</b><span>Annulés</span></div>
        </div>
      )}

      <div className="admin-table-wrap" style={{ marginBottom: 36 }}>
        <table className="admin-table">
          <thead><tr><th>N°</th><th>Heure</th><th>Client</th><th>Prestations</th><th>Total</th><th>Paiement</th><th>Caissière</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {sales.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>Aucune vente ce jour-là.</td></tr>}
            {sales.map((s) => (
              <tr key={s.id} style={s.status === 'cancelled' ? { opacity: 0.55 } : undefined}>
                <td>{s.number}</td>
                <td>{new Date(s.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>{s.client_name || '—'}</td>
                <td>{s.lines.map((l) => `${l.quantity > 1 ? `${l.quantity}× ` : ''}${l.name}`).join(', ')}</td>
                <td>{money(s.total)}{Number(s.discount) > 0 ? ` (remise ${money(s.discount)})` : ''}</td>
                <td>{PAYMENT_LABELS[s.payment_method]}</td>
                <td>{s.cashier_name || '—'}</td>
                <td>{s.status === 'cancelled' ? `Annulé — ${s.cancel_reason}` : 'Payé'}</td>
                <td>{s.status === 'paid' && <button className="icon-btn" title="Annuler le ticket" onClick={() => { setCancelFor(s); setReason(''); }}>✕</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cancelFor && (
        <div className="form-two" style={{ alignItems: 'end', marginBottom: 36 }}>
          <div className="form-row">
            <label>Motif d’annulation du ticket N° {cancelFor.number}</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </div>
          <div className="form-row" style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setCancelFor(null)}>Garder</button>
            <button className="btn btn-solid btn-sm" disabled={!reason.trim()} onClick={confirmCancel}>Annuler le ticket</button>
          </div>
        </div>
      )}

      <h3>Comptes caisse</h3>
      <p style={{ color: 'var(--ink-soft)', fontSize: '.85rem', marginTop: 0 }}>
        Ces comptes ouvrent uniquement la caisse (<code>/caisse</code>). Ils n’ont pas accès à ce tableau de bord.
      </p>
      <div className="admin-table-wrap" style={{ marginBottom: 18 }}>
        <table className="admin-table">
          <thead><tr><th>Identifiant</th><th>Nom</th><th>Statut</th><th>Dernière connexion</th><th></th></tr></thead>
          <tbody>
            {cashiers.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>Aucun compte caisse pour l’instant.</td></tr>}
            {cashiers.map((c) => (
              <tr key={c.id}>
                <td>{c.username}</td>
                <td>{c.first_name || '—'}</td>
                <td>{c.is_active ? 'Actif' : 'Désactivé'}</td>
                <td>{c.last_login ? new Date(c.last_login).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'Jamais'}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setResetFor(c); setNewPassword(''); }}>Mot de passe</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(c)}>{c.is_active ? 'Désactiver' : 'Réactiver'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetFor && (
        <div className="form-two" style={{ alignItems: 'end', marginBottom: 18 }}>
          <div className="form-row">
            <label>Nouveau mot de passe pour « {resetFor.username} »</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" autoFocus />
          </div>
          <div className="form-row" style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setResetFor(null)}>Annuler</button>
            <button className="btn btn-solid btn-sm" disabled={!newPassword} onClick={savePassword}>Enregistrer</button>
          </div>
        </div>
      )}

      <form onSubmit={createCashier} style={{ maxWidth: 640 }}>
        <h4>Nouveau compte caisse</h4>
        {formError && <div className="form-error">{formError}</div>}
        <div className="form-two">
          <div className="form-row"><label>Identifiant</label><input required value={form.username} autoCapitalize="none"
            onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ex. sarra" /></div>
          <div className="form-row"><label>Nom affiché sur le ticket</label><input value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="ex. Sarra" /></div>
        </div>
        <div className="form-row"><label>Mot de passe (8 caractères minimum)</label><input type="password" required value={form.password}
          autoComplete="new-password" onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <button className="btn btn-solid" type="submit">Créer le compte</button>
      </form>
    </div>
  );
}
