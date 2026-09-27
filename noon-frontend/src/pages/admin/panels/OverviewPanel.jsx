import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock3, Users, TrendingUp } from 'lucide-react';
import { api, errorPagePath, isPageError } from '../../../api';

const STATUS_ROWS = [
  { key: 'pending_bookings', label: 'En attente', className: 'pending', icon: Clock3 },
  { key: 'confirmed_bookings', label: 'Confirmées', className: 'confirmed', icon: CheckCircle2 },
  { key: 'done_bookings', label: 'Terminées', className: 'done', icon: CheckCircle2 },
  { key: 'cancelled_bookings', label: 'Annulées', className: 'cancelled', icon: CalendarDays },
];

function formatDay(iso) {
  if (!iso) return '';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
}

function formatDate(iso) {
  if (!iso) return 'Date à confirmer';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
}

export default function OverviewPanel() {
  const [stats, setStats] = useState(null);
  const [hoveredTrend, setHoveredTrend] = useState(null);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const navigate = useNavigate();

  async function updateRecentStatus(id, status) {
    setUpdatingBookingId(id);
    try {
      await api.updateBooking(id, { status });
      const refreshed = await api.getDashboardSummary();
      setStats(refreshed);
    } catch (err) {
      console.error('OverviewPanel: unable to update booking status', err);
    } finally {
      setUpdatingBookingId(null);
    }
  }

  useEffect(() => {
    let active = true;
    const refresh = () => {
      api
        .getDashboardSummary()
        .then((data) => { if (active) setStats(data); })
        .catch((err) => {
          if (!active) return;
          if (isPageError(err.status)) {
            navigate(errorPagePath(err.status, '/admin'), { replace: true });
          } else {
            console.error('OverviewPanel: unable to load summary', err);
          }
        });
    };
    refresh();
    const interval = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [navigate]);

  if (!stats) return <div className="loading-state">Chargement...</div>;

  const trend = stats.booking_trend || [];
  const maxTrend = Math.max(...trend.map((day) => day.count), 1);
  const trendTotal = trend.reduce((sum, day) => sum + day.count, 0);
  const statusTotal = Math.max(stats.total_bookings, 1);
  const recentBookings = stats.recent_bookings || [];
  const serviceDemand = stats.service_demand || [];
  const maxServiceDemand = Math.max(...serviceDemand.map((service) => service.count), 1);

  return (
    <div className="admin-overview">
      <div className="overview-intro">
        <div>
          <span className="overview-kicker">Pilotage en direct</span>
          <h2>Ce qui se passe chez NOON</h2>
          <p>Une lecture rapide de vos demandes, de vos services les plus choisis et de l'activité récente.</p>
        </div>
        <div className="overview-live"><span /> Données actuelles</div>
      </div>

      <div className="stat-cards overview-stat-cards">
        <div className="stat-card stat-card-primary"><b>{stats.total_bookings}</b><span>Réservations totales</span><small>Depuis l'ouverture</small></div>
        <div className="stat-card"><b>{stats.pending_bookings}</b><span>À traiter</span><small>Demandes en attente</small></div>
        <div className="stat-card"><b>{stats.bookings_today}</b><span>Aujourd'hui</span><small>Rendez-vous prévus</small></div>
        <div className="stat-card"><b>{stats.total_clients}</b><span>Clients</span><small>Comptes enregistrés</small></div>
        <div className="stat-card"><b>{stats.total_services}</b><span>Services actifs</span><small>Dans votre catalogue</small></div>
      </div>

      <div className="analysis-grid">
        <section className="analysis-panel trend-panel">
          <div className="analysis-panel-head">
            <div><span className="panel-kicker">Rythme des demandes</span><h3>Réservations sur 7 jours</h3></div>
            <TrendingUp size={20} aria-hidden="true" />
          </div>
          <div className="trend-chart" aria-label="Réservations des sept derniers jours">
            {trend.map((day) => (
              <div
                className={`trend-column${hoveredTrend === day.date ? ' is-hovered' : ''}`}
                key={day.date}
                tabIndex="0"
                onMouseEnter={() => setHoveredTrend(day.date)}
                onMouseLeave={() => setHoveredTrend(null)}
                onFocus={() => setHoveredTrend(day.date)}
                onBlur={() => setHoveredTrend(null)}
              >
                {hoveredTrend === day.date && (
                  <div className="trend-tooltip" role="status">
                    <strong>{new Date(`${day.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
                    <span><b>{day.count}</b> {day.count === 1 ? 'réservation' : 'réservations'}</span>
                    <small>{trendTotal ? `${Math.round((day.count / trendTotal) * 100)}% de l'activité` : 'Aucune activité sur la période'}</small>
                  </div>
                )}
                <span className="trend-value">{day.count}</span>
                <div className="trend-track"><div className="trend-bar" style={{ height: `${Math.max((day.count / maxTrend) * 100, day.count ? 14 : 4)}%` }} /></div>
                <span className="trend-label">{formatDay(day.date)}</span>
              </div>
            ))}
          </div>
          <div className="trend-foot"><span><i className="trend-dot" /> Demandes reçues</span><strong>{stats.bookings_today} aujourd'hui</strong></div>
        </section>

        <section className="analysis-panel status-panel">
          <div className="analysis-panel-head"><div><span className="panel-kicker">Répartition</span><h3>État des réservations</h3></div><CalendarDays size={20} aria-hidden="true" /></div>
          <div className="status-list">
            {STATUS_ROWS.map(({ key, label, className, icon: Icon }) => {
              const count = stats[key] || 0;
              return <div className="status-row" key={key}><Icon size={16} className={`status-icon ${className}`} /><span className="status-label">{label}</span><div className="status-meter"><span className={className} style={{ width: `${(count / statusTotal) * 100}%` }} /></div><b>{count}</b></div>;
            })}
          </div>
          <div className="status-total"><strong>{stats.total_bookings}</strong><span>réservations enregistrées au total</span></div>
        </section>
      </div>

      <div className="analysis-grid analysis-grid-lower">
        <section className="analysis-panel recent-panel">
          <div className="analysis-panel-head"><div><span className="panel-kicker">À surveiller</span><h3>Dernières demandes</h3></div><Users size={20} aria-hidden="true" /></div>
          {recentBookings.length ? <div className="recent-list">{recentBookings.map((booking) => <div className="recent-item" key={booking.id}><div className={`recent-avatar${booking.avatar_url ? ' has-photo' : ''}`}>{booking.avatar_url ? <img src={booking.avatar_url} alt="" /> : booking.name?.slice(0, 1).toUpperCase()}</div><div className="recent-body"><strong>{booking.name}</strong><span>{booking.service_label || 'Service à préciser'}</span></div><div className="recent-meta"><strong>{formatDate(booking.preferred_date)}</strong><span>{booking.preferred_time || 'Horaire libre'}</span><select className={`mini-status-select ${booking.status}`} value={booking.status} disabled={updatingBookingId === booking.id} onChange={(event) => updateRecentStatus(booking.id, event.target.value)} aria-label={`Statut de la réservation de ${booking.name}`}><option value="pending">En attente</option><option value="confirmed">Confirmée</option><option value="done">Terminée</option><option value="cancelled">Annulée</option></select></div></div>)}</div> : <div className="empty-state">Aucune réservation récente.</div>}
        </section>

        <section className="analysis-panel demand-panel">
          <div className="analysis-panel-head"><div><span className="panel-kicker">Préférences clients</span><h3>Services les plus choisis</h3></div><span className="demand-unit">demandes</span></div>
          {serviceDemand.length ? <div className="demand-list">{serviceDemand.map((service) => <div className="demand-row" key={service.label}><div className="demand-label"><span title={service.label}>{service.label}</span><b>{service.count}</b></div><div className="demand-track"><span style={{ width: `${(service.count / maxServiceDemand) * 100}%` }} /></div></div>)}</div> : <div className="empty-state">Pas encore assez de données.</div>}
          <div className="demand-note">Basé sur les services demandés dans les réservations enregistrées.</div>
        </section>
      </div>
    </div>
  );
}
