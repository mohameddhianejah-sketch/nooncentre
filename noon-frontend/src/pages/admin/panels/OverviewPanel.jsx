import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorPagePath, isPageError } from '../../../api';

export default function OverviewPanel() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getDashboardSummary()
      .then(setStats)
      .catch((err) => {
        // Page-level failure (server down, gateway error, timeout, ...)
        // → show the global error page with a "Try Again" back to /admin.
        if (isPageError(err.status)) {
          navigate(errorPagePath(err.status, '/admin'), { replace: true });
        } else {
          console.error('OverviewPanel: unable to load summary', err);
        }
      });
  }, [navigate]);

  if (!stats) return <div className="loading-state">Chargement...</div>;

  return (
    <div className="stat-cards">
      <div className="stat-card"><b>{stats.total_bookings}</b><span>Réservations totales</span></div>
      <div className="stat-card"><b>{stats.pending_bookings}</b><span>En attente</span></div>
      <div className="stat-card"><b>{stats.bookings_today}</b><span>Rendez-vous aujourd'hui</span></div>
      <div className="stat-card"><b>{stats.total_services}</b><span>Services actifs</span></div>
      <div className="stat-card"><b>{stats.total_testimonials}</b><span>Témoignages publiés</span></div>
    </div>
  );
}
