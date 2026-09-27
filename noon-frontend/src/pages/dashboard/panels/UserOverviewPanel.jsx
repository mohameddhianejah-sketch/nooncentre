import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../../context/LangContext';
import { api, isPageError, errorPagePath, getClient } from '../../../api';
import { CalendarCheck2, Clock, Inbox } from 'lucide-react';

function fmtDate(iso, lang) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'ar' ? 'ar-TN-u-nu-latn' : 'fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
}

export default function UserOverviewPanel({ onNavigate }) {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const client = getClient();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!client?.id) { setError(new Error('no client')); return; }
    let alive = true;
    Promise.all([api.getProfile(), api.getMyBookings()])
      .then(([p, b]) => { if (alive) { setProfile(p); setBookings(b); } })
      .catch((e) => { if (alive) setError(e); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    if (isPageError(error.status)) {
      navigate(errorPagePath(error.status, '/dashboard'), { replace: true });
      return null;
    }
    return <div className="empty-state">{t('Impossible de charger vos informations.', 'تعذر تحميل معلوماتك.')}</div>;
  }
  if (!profile || !bookings) return <div className="loading-state">{t('Chargement…', 'جارٍ التحميل…')}</div>;

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const upcoming = bookings
    .filter((b) => b.status !== 'cancelled' && b.preferred_date && new Date(`${b.preferred_date}T00:00:00`) >= todayStart)
    .sort((a, b) => (a.preferred_date + (a.preferred_time || '')).localeCompare(b.preferred_date + (b.preferred_time || '')))[0] || null;
  const counts = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    done: bookings.filter((b) => b.status === 'done').length,
  };

  const nextLabel = upcoming
    ? `${t('Le', 'في التاريخ')} ${fmtDate(upcoming.preferred_date, lang)}${upcoming.preferred_time ? ` ${t('à', 'الساعة')} ${upcoming.preferred_time.slice(0, 5)}` : ''}`
    : '';

  return (
    <div className="user-overview">
      <div className="user-welcome">
        <div>
          <h2>{t('Bonjour', 'مرحباً')}, {profile.name}</h2>
          <p>{t('Voici un aperçu de vos rendez-vous chez NOON Center.', 'إليك نظرة عامة على مواعيدك في مركز NOON.')}</p>
        </div>
        {profile.avatar_url
          ? <img className="user-welcome-avatar" src={profile.avatar_url} alt={profile.name} />
          : <div className="user-welcome-avatar user-avatar-fallback">{profile.name.slice(0, 1).toUpperCase()}</div>}
      </div>

      <div className="stat-cards">
        <div className="stat-card"><b>{counts.total}</b><span>{t('Réservations', 'الحجوزات')}</span></div>
        <div className="stat-card"><b>{counts.pending}</b><span>{t('En attente', 'قيد الانتظار')}</span></div>
        <div className="stat-card"><b>{counts.confirmed}</b><span>{t('Confirmées', 'مؤكدة')}</span></div>
        <div className="stat-card"><b>{counts.done}</b><span>{t('Terminées', 'منجزة')}</span></div>
      </div>

      <div className="user-next-card">
        {upcoming ? (
          <>
            <div className="user-next-icon"><CalendarCheck2 size={26} strokeWidth={1.6} /></div>
            <div className="user-next-body">
              <span className="user-next-label">{t('Prochain rendez-vous', 'الموعد القادم')}</span>
              <b>{nextLabel}</b>
              <div className="user-next-time"><Clock size={14} strokeWidth={1.8} /> {t('Statut', 'الحالة')} : <span className={`badge badge-${upcoming.status}`}>{t(statusLabel(upcoming.status), statusLabelAr(upcoming.status))}</span></div>
            </div>
          </>
        ) : (
          <div className="user-next-empty">
            <Inbox size={24} strokeWidth={1.6} />
            {t('Aucun rendez-vous à venir pour le moment.', 'لا توجد مواعيد قادمة حالياً.')}
          </div>
        )}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => onNavigate && onNavigate('reservations')}>
        {t('Voir mes réservations', 'عرض حجوزاتي')}
      </button>
    </div>
  );
}

function statusLabel(s) {
  return { pending: 'En attente', confirmed: 'Confirmé', cancelled: 'Annulé', done: 'Terminé' }[s] || s;
}
function statusLabelAr(s) {
  return { pending: 'قيد الانتظار', confirmed: 'مؤكد', cancelled: 'ملغى', done: 'منجز' }[s] || s;
}