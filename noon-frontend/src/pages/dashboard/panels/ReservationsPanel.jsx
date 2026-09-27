import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../../context/LangContext';
import { api, getClient, isPageError, errorPagePath } from '../../../api';
import { CalendarCheck2, Clock, Inbox, Trash2 } from 'lucide-react';

function fmtDate(iso, lang) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'ar' ? 'ar-TN-u-nu-latn' : 'fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
}
function statusLabel(s) {
  return { pending: 'En attente', confirmed: 'Confirmé', cancelled: 'Annulé', done: 'Terminé' }[s] || s;
}
function statusLabelAr(s) {
  return { pending: 'قيد الانتظار', confirmed: 'مؤكد', cancelled: 'ملغى', done: 'منجز' }[s] || s;
}

export default function ReservationsPanel() {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const client = getClient();
  const [bookings, setBookings] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!client?.id) { setError('no client'); return; }
    let alive = true;
    api
      .getMyBookings()
      .then((b) => { if (alive) setBookings(b); })
      .catch((e) => { if (alive) setError(e); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel(b) {
    if (!window.confirm(t('Voulez-vous vraiment annuler cette réservation ?', 'هل تريد حقاً إلغاء هذا الحجز؟'))) return;
    setCancellingId(b.id);
    try {
      await api.cancelMyBooking(b.id);
      setBookings((prev) => prev.filter((x) => x.id !== b.id));
    } catch (e) {
      if (isPageError(e.status)) navigate(errorPagePath(e.status, '/dashboard'), { replace: true });
      else setError(e);
    } finally {
      setCancellingId(null);
    }
  }

  if (error === 'no client') {
    return <div className="empty-state">{t('Veuillez vous connecter.', 'الرجاء تسجيل الدخول.')}</div>;
  }
  if (error) {
    return <div className="empty-state">{t('Impossible de charger vos réservations.', 'تعذر تحميل حجوزاتك.')}</div>;
  }
  if (!bookings) return <div className="loading-state">{t('Chargement…', 'جارٍ التحميل…')}</div>;

  if (bookings.length === 0) {
    return (
      <div className="empty-state">
        <Inbox size={34} strokeWidth={1.5} />
        <p>{t('Vous n’avez pas encore de réservation.', 'لا توجد لديك حجوزات بعد.')}</p>
      </div>
    );
  }

  const sorted = [...bookings].sort((a, b) =>
    (a.preferred_date || a.preferredDay || '').localeCompare(b.preferred_date || b.preferredDay || '')
  );

  return (
    <div className="reservations-list">
      {sorted.map((b) => (
        <div key={b.id} className="reservation-item">
          <div className="reservation-item-icon"><CalendarCheck2 size={20} strokeWidth={1.7} /></div>
          <div className="reservation-item-body">
            <div className="reservation-item-title">
              <span>{b.service_name || b.service_label || t('Réservation', 'حجز')}</span>
              <span className={`badge badge-${b.status}`}>{t(statusLabel(b.status), statusLabelAr(b.status))}</span>
            </div>
            <div className="reservation-item-meta">
              <span><Clock size={13} strokeWidth={1.8} /> {fmtDate(b.preferred_date || b.preferredDay, lang)}</span>
              {b.preferred_time && <span>{b.preferred_time.slice(0, 5)}</span>}
            </div>
          </div>
          {(b.status === 'pending' || b.status === 'confirmed') && (
            <button
              type="button"
              className="btn btn-ghost btn-sm reservation-item-cancel"
              disabled={cancellingId === b.id}
              onClick={() => handleCancel(b)}
            >
              <Trash2 size={14} strokeWidth={1.8} />
              {cancellingId === b.id ? t('…', '…') : t('Annuler', 'إلغاء')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
