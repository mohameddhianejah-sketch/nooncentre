import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import OverviewPanel from './panels/OverviewPanel';
import BookingsPanel from './panels/BookingsPanel';
import ClientsPanel from './panels/ClientsPanel';
import ServicesPanel from './panels/ServicesPanel';
import TestimonialsPanel from './panels/TestimonialsPanel';
import GalleryPanel from './panels/GalleryPanel';
import HoursPanel from './panels/HoursPanel';
import SettingsPanel from './panels/SettingsPanel';

const TABS = [
  { key: 'overview', label: "Vue d'ensemble", Comp: OverviewPanel },
  { key: 'bookings', label: 'Réservations', Comp: BookingsPanel },
  { key: 'clients', label: 'Clients', Comp: ClientsPanel },
  { key: 'services', label: 'Services & catégories', Comp: ServicesPanel },
  { key: 'testimonials', label: 'Témoignages', Comp: TestimonialsPanel },
  { key: 'gallery', label: 'Galerie photos', Comp: GalleryPanel },
  { key: 'hours', label: "Horaires d'ouverture", Comp: HoursPanel },
  { key: 'settings', label: 'Paramètres du site', Comp: SettingsPanel },
];

export default function Dashboard() {
  const [tab, setTab] = useState('overview');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const Active = TABS.find((t) => t.key === tab).Comp;

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <img src={logo} alt="NOON Center" style={{ height: 40, width: 40, borderRadius: '50%' }} />
          <span style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', marginInlineStart: 10 }}>NOON Admin</span>
        </div>
        {TABS.map((t) => (
          <button key={t.key} className={`admin-nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
        <div className="logout-btn">
          <button className="admin-nav-item" onClick={handleLogout}>Déconnexion ({user?.username})</button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-header">
          <h1>{TABS.find((t) => t.key === tab).label}</h1>
        </div>
        <Active />
      </main>
    </div>
  );
}
