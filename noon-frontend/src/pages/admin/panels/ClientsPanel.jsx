import { useEffect, useState } from 'react';
import { api } from '../../../api';

export default function ClientsPanel() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.getClients().then((data) => { setClients(data); setLoading(false); }).catch(() => setLoading(false));
  }

  useEffect(load, []);

  async function remove(id) {
    if (!window.confirm('Supprimer ce compte client ?')) return;
    await api.deleteClient(id);
    setClients(clients.filter((c) => c.id !== id));
  }

  return (
    <>
      <div className="admin-toolbar">
        <div style={{ fontSize: '.85rem', color: 'var(--ink-soft)' }}>
          {clients.length} {clients.length > 1 ? 'comptes clients' : 'compte client'}
        </div>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="loading-state">Chargement...</div>
        ) : clients.length === 0 ? (
          <div className="empty-state">Aucun compte client pour le moment.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nom complet</th>
                <th>Téléphone</th>
                <th>Date de naissance</th>
                <th>Réservations</th>
                <th>Compte créé le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td><a href={`tel:${c.phone}`}>{c.phone}</a></td>
                  <td>{c.birthday || '—'}</td>
                  <td>{c.booking_count ?? 0}</td>
                  <td>{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <button className="icon-btn" title="Supprimer" onClick={() => remove(c.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}