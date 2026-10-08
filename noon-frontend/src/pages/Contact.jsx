import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { api, getClient, setClient } from '../api';
import CalendarPicker from '../components/CalendarPicker';
import { SpinningBorderButton } from '../components/SpinningBorderButton';
import LocationMapCard from '../components/LocationMapCard';
import ClientAuthCard from '../components/ClientAuthCard';
import { ImagePlus, MessageCircle, X } from 'lucide-react';

const DAY_LABELS = {
  fr: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
  ar: ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'],
};

const OTHER_ID = 'other';

const STEP_TITLES = [
  { fr: 'Vos soins', ar: 'عناياتكِ' },
  { fr: 'Votre date', ar: 'تاريخكِ' },
  { fr: 'Votre horaire', ar: 'موعدكِ' },
  { fr: 'Confirmation', ar: 'التأكيد' },
];

const FR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const AR_MONTHS = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function Contact() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [hours, setHours] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(() => {
    const c = getClient();
    return {
      name: c?.name || '',
      phone: c?.phone || '',
      birthday: c?.birthday || '',
      serviceIds: [],
      date: '',
      times: {}, // category slug -> "HH:MM"
      message: '',
    };
  });
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState('');
  const [status, setStatus] = useState(null); // null | 'sending' | 'success' | 'error'
  const [submitError, setSubmitError] = useState(null); // API detail when save fails
  const [whatsappText, setWhatsappText] = useState(''); // saved booking summary for the success screen
  const [availability, setAvailability] = useState(null);
  const [anchorSlug, setAnchorSlug] = useState(null); // category whose time anchors the recommended sequence
  const [client, setClientState] = useState(() => getClient());
  const [authSuccess, setAuthSuccess] = useState('');
  const [feedback, setFeedback] = useState({ text: '', avatar: null });
  const [feedbackPreview, setFeedbackPreview] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState(null);

  useEffect(() => () => {
    if (feedbackPreview) URL.revokeObjectURL(feedbackPreview);
  }, [feedbackPreview]);

  const allServices = useMemo(
    () => categories.flatMap((c) => c.services.filter((s) => s.is_active)),
    [categories]
  );

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
    api.getHours().then(setHours).catch(() => {});
    api.getCategories().then((data) => {
      setCategories(data);
      const preset = Number(searchParams.get('service'));
      if (preset) {
        setForm((f) => (f.serviceIds.includes(preset) ? f : { ...f, serviceIds: [...f.serviceIds, preset] }));
      }
    }).catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    if (window.location.hash !== '#booking') return;
    const el = document.getElementById('booking');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [categories]);

  useEffect(() => {
    if (!client) return;
    setForm((f) => ({
      ...f,
      name: f.name || client.name || '',
      phone: f.phone || client.phone || '',
      birthday: f.birthday || client.birthday || '',
    }));
  }, [client]);

  const selectedServices = allServices.filter((s) => form.serviceIds.includes(s.id));
  const otherSelected = form.serviceIds.includes(OTHER_ID);
  const selectedLabels = [
    ...selectedServices.map((s) => t(s.name_fr, s.name_ar)),
    ...(otherSelected ? [t('Autre / Je ne sais pas encore', 'أخرى / لم أقرر بعد')] : []),
  ];
  const selectedTotal = selectedServices.reduce((sum, s) => sum + Number(s.price_tnd || 0), 0);
  // A "starting from" price makes the total a minimum, not a final amount.
  const totalPrefix = selectedServices.some((s) => s.price_is_from) ? `${t('À partir de', 'ابتداءً من')} ` : '';

  // Category slugs in the order the client selected their services.
  const orderedCatSlugs = (() => {
    const seen = [];
    for (const id of form.serviceIds) {
      const svc = allServices.find((s) => s.id === id);
      const slug = svc?.category_slug;
      if (slug && !seen.includes(slug)) seen.push(slug);
    }
    return seen;
  })();

  const catSlugsForTime = [...new Set(selectedServices.map((s) => s.category_slug).filter(Boolean))];
  const hasSelectableTimes = catSlugsForTime.length > 0;
  const catName = (slug) => {
    const c = categories.find((x) => x.slug === slug);
    return c ? t(c.name_fr, c.name_ar) : slug;
  };
  const planOrder = (orderedCatSlugs.length ? orderedCatSlugs : catSlugsForTime)
    .slice()
    .sort((a, b) => {
      const ta = form.times[a] || '99:99';
      const tb = form.times[b] || '99:99';
      return ta.localeCompare(tb);
    });

  // Once the current step's selection becomes valid, drop the inline error.
  useEffect(() => {
    let valid = false;
    if (step === 1) valid = form.serviceIds.length > 0;
    else if (step === 2) valid = !!form.date && !availability?.is_closed;
    else if (step === 3) valid = !hasSelectableTimes || Object.keys(form.times).length > 0;
    else if (step === 4) valid = form.name.trim() !== '' && form.phone.trim() !== '';
    if (valid) setStepError('');
  }, [step, form, availability, hasSelectableTimes]);

  const phone = settings?.phone || '+21629909099';
  const whatsapp = (settings?.whatsapp || '21629909099').replace(/\D/g, '');
  const address = settings ? t(settings.address_fr, settings.address_ar) : t(
    'Rue Ahmed Amine, Boumhel El Bassatine, Ben Arous — en face de la BIAT',
    'نهج أحمد أمين، بومهل البساتين، بن عروس — مقابل بنك BIAT'
  );

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function saveSession(account) {
    const session = {
      id: account.id,
      name: account.name,
      phone: account.phone,
      birthday: account.birthday,
      avatar_url: account.avatar_url || '',
      session_token: account.session_token,
    };
    setClientState(session);
    setClient(session);
  }

  function handleAuthenticated(account, message) {
    saveSession(account);
    if (message) setAuthSuccess(message);
  }

  function handleLogout() {
    setClientState(null);
    setClient(null);
    setAuthSuccess('');
    setForm((f) => ({ ...f, name: '', phone: '', birthday: '' }));
  }

  async function handleFeedbackSubmit(e) {
    e.preventDefault();
    if (!feedback.text.trim()) return;
    setFeedbackStatus('sending');
    try {
      const body = new FormData();
      body.append('text_fr', feedback.text.trim());
      body.append('text_ar', feedback.text.trim());
      body.append('rating', '5');
      if (feedback.avatar) body.append('avatar', feedback.avatar);
      await api.createTestimonial(body);
      setFeedback({ text: '', avatar: null });
      setFeedbackPreview('');
      setFeedbackStatus('success');
    } catch {
      setFeedbackStatus('error');
    }
  }

  function handleFeedbackPhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setFeedback({ ...feedback, avatar: file });
    setFeedbackPreview(URL.createObjectURL(file));
  }

  function removeFeedbackPhoto() {
    setFeedback({ ...feedback, avatar: null });
    setFeedbackPreview('');
  }

  function handleDateSelect(dateStr) {
    setStep(2);
    setForm((f) => ({ ...f, date: dateStr, times: {} }));
    setAnchorSlug(null);
    setAvailability(null);
    setStepError('');
    api.getAvailability(dateStr).then(setAvailability).catch(() => {});
  }

  function toggleService(id) {
    setForm((f) => {
      const has = f.serviceIds.includes(id);
      // When removing a service, also drop the time chosen for its category
      // (only if no other selected service shares that category).
      let times = f.times;
      if (has) {
        const svc = allServices.find((s) => s.id === id);
        const slug = svc?.category_slug;
        const stillShares = slug && allServices.some(
          (s) => s.id !== id && f.serviceIds.includes(s.id) && s.category_slug === slug
        );
        if (slug && !stillShares) {
          times = { ...f.times };
          delete times[slug];
        }
      }
      return {
        ...f,
        serviceIds: has ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id],
        times,
      };
    });
    setAnchorSlug(null);
  }

  function withTimeout(promise, ms) {
    let timer;
    return Promise.race([
      promise.finally(() => clearTimeout(timer)),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), ms); }),
    ]);
  }

  function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    if (lang === 'ar') return `${d} ${AR_MONTHS[m - 1]} ${y}`;
    return `${d} ${FR_MONTHS[m - 1]} ${y}`;
  }

  function goNext() {
    let msg = '';
    if (step === 1 && form.serviceIds.length === 0) {
      msg = t('Veuillez sélectionner au moins un soin.', 'يرجى اختيار عناية واحدة على الأقل.');
    } else if (step === 2) {
      if (!form.date) {
        msg = t('Veuillez choisir une date pour votre réservation.', 'يرجى اختيار تاريخ لحجزك.');
      } else if (availability?.is_closed) {
        msg = t('Fermé ce jour — veuillez choisir une autre date.', 'مغلق في هذا اليوم — يرجى اختيار تاريخ آخر.');
      }
    } else if (step === 3 && hasSelectableTimes && Object.keys(form.times).length === 0) {
      msg = t('Veuillez choisir une heure.', 'يرجى اختيار وقت.');
    }
    if (msg) {
      setStepError(msg);
      return;
    }
    setStepError('');
    setStep((s) => Math.min(4, s + 1));
  }

  function goBack() {
    setStepError('');
    setStep((s) => Math.max(1, s - 1));
  }

  function startNewReservation() {
    setStatus(null);
    setSubmitError(null);
    setWhatsappText('');
    setStep(1);
  }

  // French summary of the booking, sent to the centre's WhatsApp number.
  function buildWhatsappText({ name, phone, date, times, message }) {
    const services = [
      ...selectedServices.map((s) => s.name_fr),
      ...(otherSelected ? ['Autre / Je ne sais pas encore'] : []),
    ].join(', ');
    const dateLabel = date
      ? new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const timeLines = Object.entries(times || {})
      .filter(([, time]) => time)
      .map(([slug, time]) => {
        const c = categories.find((x) => x.slug === slug);
        return `  • ${c?.name_fr || slug} : ${time}`;
      });
    return [
      'Nouvelle réservation NOON Center',
      `Nom : ${name}`,
      `Téléphone : ${phone}`,
      `Services : ${services || '—'}`,
      `Date : ${dateLabel}`,
      ...(timeLines.length ? ['Horaires :', ...timeLines] : []),
      `Note : ${message?.trim() || '—'}`,
    ].join('\n');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.date) {
      setStepError(t('Veuillez choisir une date pour votre réservation.', 'يرجى اختيار تاريخ لحجزك.'));
      return;
    }
    if (!form.name.trim() || !form.phone.trim()) {
      setStepError(t('Veuillez entrer votre nom et votre téléphone.', 'يرجى إدخال اسمكِ ورقم هاتفكِ.'));
      return;
    }
    const serviceLabel = selectedLabels.join(' · ');
    const catSlugArr = [...new Set(selectedServices.map((s) => s.category_slug).filter(Boolean))];
    const categorySlugs = catSlugArr.join(',');
    const primaryTime = catSlugArr.map((slug) => form.times[slug]).find((x) => x) || null;
    const cName = client?.name || form.name;
    const cPhone = client?.phone || form.phone;
    const cBirthday = (client?.birthday || form.birthday || '').trim();
    const bookingData = {
      client_id: client?.id,
      name: cName,
      phone: cPhone,
      service_label: serviceLabel,
      category_slugs: categorySlugs,
      category_times: form.times,
      preferred_date: form.date,
      preferred_time: primaryTime,
      message: form.message,
      language: lang,
    };
    // Only include the birthday when actually filled in: the API rejects an
    // explicit null (DateField without allow_null).
    if (cBirthday) bookingData.birthday = cBirthday;
    const text = buildWhatsappText({ name: cName, phone: cPhone, date: form.date, times: form.times, message: form.message });
    // Open the tab now, while we're still inside the click: browsers block
    // popups opened after an await. It is pointed at WhatsApp once saved.
    const waWindow = window.open('', '_blank');
    if (waWindow) waWindow.opener = null;
    setSubmitError(null);
    setStatus('sending');
    try {
      await withTimeout(api.createBooking(bookingData), 8000);
      const waUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
      if (waWindow) waWindow.location.replace(waUrl);
      else window.location.assign(waUrl);
      setWhatsappText(text);
      setStatus('success');
      setStepError('');
      setStep(1);
      setForm({
        name: client?.name || '',
        phone: client?.phone || '',
        birthday: client?.birthday || '',
        serviceIds: [],
        date: '',
        times: {},
        message: '',
      });
    } catch (err) {
      waWindow?.close();
      setSubmitError(typeof err?.message === 'string' && err.message !== 'Request failed' ? err.message : null);
      setStatus('error');
    }
  }

  const SLOT_STEP = 30; // minutes between consecutive grid slots

  function timeToMin(val) {
    const [h, m1] = val.split(':').map(Number);
    return h * 60 + m1;
  }

  // Slots starting at or before this minute of the chosen day are in the past
  // (-1 when the chosen day is in the future). Uses the centre's time zone.
  function pastCutoffMin() {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(new Date()).map((p) => [p.type, p.value])
    );
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    if (form.date !== today) return -1;
    return Number(parts.hour) * 60 + Number(parts.minute);
  }

  // Duration of one appointment in a category (used to chain the follow-up).
  // Each next service starts once the previous one is finished.
  function durationOf(slug) {
    const c = categories.find((x) => x.slug === slug);
    return Number(c?.duration_minutes) || SLOT_STEP;
  }

  // When a time is picked for any category, that category becomes the anchor:
  // the app auto-recommends a back-to-back sequence for the OTHER selected
  // categories. Each next appointment starts once the previous category's
  // duration is finished (e.g. coiffure booked right after spa ends).
  // She can press any category first and change any recommended time afterwards.
  function buildRecommendedTimes(startSlug, startTime) {
    if (!availability || availability.is_closed || !availability.open_time) {
      return { [startSlug]: startTime };
    }
    const caps = availability.capacities || {};
    const counts = availability.category_counts || {};
    const [oh, om] = availability.open_time.split(':').map(Number);
    const [ch, cm] = availability.close_time.split(':').map(Number);
    const startMin = oh * 60 + om;
    const endMin = ch * 60 + cm;
    const allSlots = [];
    let m = startMin;
    while (m < endMin) {
      allSlots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
      m += SLOT_STEP;
    }
    const isAvailable = (slug, val) => {
      const cap = Number(caps[slug]) || 1;
      const used = Number((counts[val] || {})[slug]) || 0;
      return used < cap;
    };
    const cutoff = pastCutoffMin();
    const findNext = (slug, fromMin, excludeSlots) => {
      for (const val of allSlots) {
        if (timeToMin(val) < fromMin || timeToMin(val) <= cutoff) continue;
        if (excludeSlots.has(val)) continue;
        if (isAvailable(slug, val)) return val;
      }
      return null;
    };

    // Sequence: start from the chosen category, then the other selected
    // categories in the order they appear in orderedCatSlugs.
    const sequence = [startSlug, ...orderedCatSlugs.filter((s) => s !== startSlug)];

    const times = { [startSlug]: startTime };
    const exclude = new Set([startTime]);
    // Next appointment starts once the anchor's own duration is over
    let running = timeToMin(startTime) + durationOf(startSlug);
    for (const slug of sequence) {
      if (slug === startSlug) continue;
      const next = findNext(slug, running, exclude);
      if (next) {
        times[slug] = next;
        exclude.add(next);
        // Following appointment starts once this category's appointment ends
        running = timeToMin(next) + durationOf(slug);
      } else {
        running += SLOT_STEP;
      }
    }
    return times;
  }

  function pickTime(slug, val) {
    // Trigger the auto-recommendation on the very first time-pick (whichever
    // category she chooses); later picks only set that category's own time.
    if (anchorSlug === null) {
      setAnchorSlug(slug);
      setForm((f) => ({ ...f, times: buildRecommendedTimes(slug, val) }));
    } else {
      setForm((f) => ({ ...f, times: { ...f.times, [slug]: val } }));
    }
  }

  function renderCategorySlots(slug, categoryName) {
    if (!availability || availability.is_closed || !availability.open_time) return null;
    const [oh, om] = availability.open_time.split(':').map(Number);
    const [ch, cm] = availability.close_time.split(':').map(Number);
    const capacities = availability.capacities || {};
    const catCounts = availability.category_counts || {};
    const cap = Number(capacities[slug]) || 1;
    const chosen = form.times[slug];
    const isAnchor = anchorSlug === slug;
    const slots = [];
    const cutoff = pastCutoffMin();
    let m = oh * 60 + om;
    const end = ch * 60 + cm;
    while (m < end) {
      const val = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const used = Number((catCounts[val] || {})[slug]) || 0;
      const remaining = Math.max(0, cap - used);
      const isFull = remaining === 0;
      const isPast = m <= cutoff;
      const isSelected = chosen === val && !isPast;
      let cls = 'time-slot';
      if (isSelected) cls += ' time-selected';
      else if (isPast || isFull) cls += ' time-booked';
      slots.push(
        <button
          key={val}
          type="button"
          className={cls}
          disabled={isPast || isFull}
          onClick={() => pickTime(slug, val)}
        >
          {val}
          <em className="time-slot-avail">
            {isPast
              ? t('Passé', 'فات')
              : isFull
                ? t('Plein', 'ممتلئ')
                : (cap > 1 ? `${remaining}/${cap}` : t('Dispo', 'متاح'))}
          </em>
        </button>
      );
      m += 30;
    }
    return (
      <div className="cat-time-table" key={slug}>
        <div className="cat-time-title">
          <span>{categoryName}{isAnchor ? ` (${t('1er soin', 'العناية الأولى')})` : ''}</span>
          <em>{t(`Capacité : ${cap}`, `الطاقة: ${cap}`)}</em>
        </div>
        <div className="time-slots">{slots}</div>
        {orderedCatSlugs.length > 1 && !anchorSlug && (
          <div className="cal-booked-msg recommend-hint">
            {t('Choisissez une heure pour une de ces catégories : nous recommandons automatiquement l\'enchaînement des autres.', 'اختاري وقتاً لأي عناية: نقترح تلقائياً تتابع بقية العنايات.')}
          </div>
        )}
        {chosen && (() => {
          const used = Number((catCounts[chosen] || {})[slug]) || 0;
          const chosenFull = used >= cap;
          return chosenFull ? (
            <div className="cal-booked-msg warning">
              {t(`${categoryName} est complet à ${chosen}. Vous pouvez quand même réserver, nous vous confirmerons.`,
                 `${categoryName} ممتلئ في ${chosen}. يمكنك الحجز وسنؤكد لك.`)}
            </div>
          ) : (
            <div className="cal-booked-msg">
              {t(`${categoryName} disponible à ${chosen} (${Math.max(0, cap - used)} place(s) restante(s)).`,
                 `${categoryName} متاح في ${chosen} بقي ${Math.max(0, cap - used)} مكان.`)}
            </div>
          );
        })()}
      </div>
    );
  }

  function renderTimeStep() {
    if (catSlugsForTime.length === 0) {
      return (
        <p className="form-note" style={{ marginTop: 6 }}>
          {t('Sélectionnez un soin pour choisir l\'heure.', 'اخترِ عناية لاختيار الوقت.')}
        </p>
      );
    }
    if (availability?.is_closed) {
      return (
        <div className="cal-closed-msg">
          {t('Fermé ce jour — veuillez choisir une autre date.', 'مغلق في هذا اليوم — يرجى اختيار تاريخ آخر.')}
        </div>
      );
    }
    if (!availability || !availability.open_time) {
      return (
        <p className="form-note" style={{ marginTop: 6 }}>
          {t('Chargement des horaires...', 'جارٍ تحميل الأوقات...')}
        </p>
      );
    }
    return (
      <div className="cat-time-tables">
        {(orderedCatSlugs.length ? orderedCatSlugs : catSlugsForTime)
          .map((slug) => renderCategorySlots(slug, catName(slug)))}
        {Object.keys(form.times).length > 0 && (
          <div className="plan-summary">
            <div className="plan-summary-title">{t('Votre programme', 'برنامجك')}</div>
            {planOrder.map((slug) => (
              <div className="plan-line" key={slug}>
                <span>{catName(slug)}</span>
                <em>{form.times[slug] || t('à choisir', 'يُختار')}</em>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function stepIcon() {
    const common = {
      width: 24,
      height: 24,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: '#8C2F55',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
    };
    if (step === 1) {
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12.5" rx="8.5" ry="9" />
          <circle cx="9" cy="10.5" r=".9" />
          <circle cx="15" cy="10.5" r=".9" />
          <path d="M9.4 14.6c1.5 1.4 3.7 1.4 5.2 0" />
        </svg>
      );
    }
    if (step === 2) {
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2.5" />
          <path d="M8 3v4M16 3v4" />
          <path d="M3 10.5h18" />
        </svg>
      );
    }
    if (step === 3) {
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 12L7.8 8.2" />
          <path d="M12 12l4.4 1.8" />
        </svg>
      );
    }
    return (
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 12.5l5 5L20 6.5" />
      </svg>
    );
  }

  const curStep = STEP_TITLES[step - 1];

  return (
    <section style={{ paddingTop: 56, paddingBottom: 20 }}>
      <div className="section-inner">
        <div className="section-head">
          <div className="kicker">{t('Nous trouver', 'موقعنا')}</div>
          <h2>{t('Contact & informations pratiques', 'معلومات التواصل')}</h2>
        </div>

        {!client && (
          <ClientAuthCard
            id="booking"
            initialMode={searchParams.get('mode') === 'login' ? 'login' : 'signup'}
            onAuthenticated={handleAuthenticated}
          />
        )}

        <div className="contact-grid">
          <div>
            <div className="info-line">
              <div className="k">{t('Adresse', 'العنوان')}</div>
              <div className="v">{address}</div>
            </div>
            <div className="info-line">
              <div className="k">{t('Téléphone', 'الهاتف')}</div>
              <div className="v"><a href={`tel:${phone}`}>{phone}</a></div>
            </div>
            <div className="info-line">
              <div className="k">WhatsApp</div>
              <div className="v"><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">{phone}</a></div>
            </div>
            {settings?.facebook_url && (
              <div className="info-line">
                <div className="k">{t('Facebook', 'فيسبوك')}</div>
                <div className="v"><a href={settings.facebook_url} target="_blank" rel="noreferrer">NOON center</a></div>
              </div>
            )}

            <table className="hours-table">
              <tbody>
                {(hours.length ? hours : Array.from({ length: 7 }, (_, i) => ({ weekday: i, is_closed: i === 0, open_time: '09:00', close_time: '19:00' })))
                  .sort((a, b) => a.weekday - b.weekday)
                  .map((h) => (
                    <tr key={h.weekday} className={h.is_closed ? 'closed' : ''}>
                      <td>{DAY_LABELS[lang][h.weekday]}</td>
                      <td>{h.is_closed ? t('Fermé', 'مغلق') : `${(h.open_time || '').slice(0, 5)} – ${(h.close_time || '').slice(0, 5)}`}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <p className="price-note">
              {t('* Horaires indicatifs — merci de confirmer par téléphone en période de fêtes ou Ramadan.',
                 '* التوقيت تقريبي، يرجى التأكيد هاتفياً خلال الأعياد أو رمضان.')}
            </p>

            {client && (
              <LocationMapCard
                location={t('NOON Center — Boumhel El Bassatine', 'مركز NOON — بومهل البساتين')}
                latitude={settings?.latitude ?? 36.7248}
                longitude={settings?.longitude ?? 10.292}
                address={address}
                zoom={16}
                expandLabel={t('Agrandir la carte', 'تكبير الخريطة')}
                collapseLabel={t('Réduire la carte', 'تصغير الخريطة')}
                directionsLabel={t('Itinéraire', 'الاتجاهات')}
                detailsLabel={t('Adresse', 'العنوان')}
              />
            )}
          </div>

          {!client && (
            <LocationMapCard
              location={t('NOON Center — Boumhel El Bassatine', 'مركز NOON — بومهل البساتين')}
              latitude={settings?.latitude ?? 36.7248}
              longitude={settings?.longitude ?? 10.292}
              address={address}
              zoom={16}
              expandLabel={t('Agrandir la carte', 'تكبير الخريطة')}
              collapseLabel={t('Réduire la carte', 'تصغير الخريطة')}
              directionsLabel={t('Itinéraire', 'الاتجاهات')}
              detailsLabel={t('Adresse', 'العنوان')}
            />
          )}

          {client && (
            <div className="form-card" id="booking">
              <h3>{t('Réserver votre rendez-vous', 'احجزي موعدك')}</h3>
              <p style={{ fontSize: '.85rem' }}>
                {t('Sélectionnez vos soins puis envoyez la demande.', 'اختاري عناياتكِ ثم أرسلي الطلب.')}
              </p>

            {status === 'error' && (
              <div className="form-error">
                {submitError
                  ? `${t("La demande n'a pas pu être enregistrée", 'تعذر حفظ الطلب')} : ${submitError}`
                  : t("La demande n'a pas pu être enregistrée. Veuillez réessayer.", 'تعذر حفظ الطلب. يرجى المحاولة مرة أخرى.')}
              </div>
            )}

              <>
                {authSuccess && (
                  <div className="form-success">{authSuccess}</div>
                )}
                <div className="account-bar">
                  <span className="account-bar-info">
                    {client.session_token ? t('Connecté ·', 'متصلة ·') : t('Prêt à réserver ·', 'جاهز للحجز ·')} <b>{client.name}</b> <span className="account-phone">{client.phone}</span>
                  </span>
                  <SpinningBorderButton type="button" className="sbb-sm" onClick={handleLogout}>
                    {t('Se déconnecter', 'تسجيل الخروج')}
                  </SpinningBorderButton>
                </div>

                {client.session_token && (
                <div className="feedback-box">
                  <h3>{t('Partagez votre expérience', 'شاركي تجربتك')}</h3>
                  <p>{t('Écrivez-nous votre avis, dans la langue qui vous ressemble.', 'اكتبي لنا رأيك، وباللغة التي تفضلينها.')}</p>
                  <form onSubmit={handleFeedbackSubmit}>
                    <div className="form-row feedback-text-field feedback-single-field"><label htmlFor="feedback-text">{t('Votre avis', 'رأيك')}</label><textarea id="feedback-text" className="feedback-textarea" dir="auto" placeholder={t('Écrivez-nous votre feedback et sentez-vous libre d’utiliser la langue que vous préférez...', 'اكتبي لنا رأيك بكل حرية وباللغة التي تفضلينها...')} value={feedback.text} onChange={(e) => setFeedback({ ...feedback, text: e.target.value })} /></div>
                    <div className="form-row feedback-photo-field">
                      <label>{t('Votre photo (optionnelle)', 'صورتك (اختياري)')}</label>
                      <div className={`feedback-attachment ${feedbackPreview ? 'has-file' : ''}`}>
                        <label className="feedback-attachment-trigger" htmlFor="feedback-photo">
                          <ImagePlus size={17} strokeWidth={1.8} />
                          <span>{t('Ajouter une photo', 'إضافة صورة')}</span>
                          <input id="feedback-photo" className="feedback-photo-input" type="file" accept="image/*" onChange={handleFeedbackPhotoChange} />
                        </label>
                        {feedback.avatar && feedbackPreview && (
                          <div className="feedback-attachment-card">
                            <img src={feedbackPreview} alt="" />
                            <span className="feedback-attachment-info">
                              <strong>{feedback.avatar.name}</strong>
                              <small>{(feedback.avatar.size / 1024 / 1024).toFixed(2)} MB</small>
                            </span>
                            <button type="button" className="feedback-attachment-remove" onClick={removeFeedbackPhoto} aria-label={t('Supprimer la photo', 'حذف الصورة')} title={t('Supprimer la photo', 'حذف الصورة')}>
                              <X size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm feedback-submit" type="submit" disabled={feedbackStatus === 'sending'}><span>{t('Envoyer mon avis', 'إرسال رأيي')}</span><span className="feedback-submit-arrow" aria-hidden="true">↗</span></button>
                    {feedbackStatus === 'success' && <span className="feedback-status">{t('Merci, votre avis sera publié après validation.', 'شكراً، سيُنشر رأيك بعد المراجعة.')}</span>}
                    {feedbackStatus === 'error' && <span className="form-error">{t('Impossible d’envoyer votre avis.', 'تعذر إرسال رأيك.')}</span>}
                  </form>
                </div>
                )}

                {status === 'success' ? (
                  <div className="booking-complete">
                    <div className="booking-complete-mark" aria-hidden="true">✓</div>
                    <span className="booking-complete-kicker">{t('Réservation enregistrée', 'تم تسجيل الحجز')}</span>
                    <h4>{t('Merci, votre demande est bien arrivée.', 'شكراً، وصل طلبكِ بنجاح.')}</h4>
                    <p>{t('Envoyez le message préparé dans WhatsApp pour finaliser votre réservation. Notre équipe vous contactera bientôt pour la confirmer.', 'أرسلي الرسالة الجاهزة في واتساب لإتمام حجزكِ. سيتصل بكِ فريقنا قريباً لتأكيده.')}</p>
                    <div className="booking-complete-actions">
                      {whatsappText && (
                        <a
                          className="wiz-next wiz-whatsapp"
                          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(whatsappText)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle size={18} aria-hidden="true" />
                          {t('Rouvrir WhatsApp', 'إعادة فتح واتساب')}
                        </a>
                      )}
                      <button type="button" className="wiz-next wiz-accent" onClick={startNewReservation}>
                        {t('Nouvelle réservation', 'حجز موعد آخر')}
                      </button>
                      <button type="button" className="wiz-back" onClick={() => navigate('/')}>
                        {t("Retour à l'accueil", 'العودة إلى الرئيسية')}
                      </button>
                    </div>
                  </div>
                ) : (
                <>
                <div className="wiz-progress">
                  <div className="wiz-progress-fill" style={{ width: `${(step / 4) * 100}%` }} />
                </div>

                <form onSubmit={handleSubmit}>
              <div className="wiz-head">
                <span className="wiz-step-icon">{stepIcon()}</span>
                <span className="wiz-head-text">
                  <span className="wiz-step-title">{t(curStep.fr, curStep.ar)}</span>
                  <span className="wiz-step-count">{t(`Étape ${step} sur 4`, `الخطوة ${step} من 4`)}</span>
                </span>
              </div>

              <div className="wiz-card" key={step}>
                {step === 1 && (
                  <div className="form-row">
                    <label>{t('Soins souhaités (un ou plusieurs)', 'العنايات المطلوبة (واحدة أو أكثر)')}</label>
                    <div className="svc-pick">
                      {categories.map((c, index) => {
                        const items = c.services.filter((s) => s.is_active);
                        if (!items.length) return null;
                        return (
                          <details
                            className="svc-pick-group"
                            key={c.id}
                            open={index === 0 || items.some((s) => form.serviceIds.includes(s.id))}
                          >
                            <summary className="svc-pick-cat">
                              {t(c.name_fr, c.name_ar)}
                              <span className="svc-pick-count">{items.length}</span>
                            </summary>
                            <div className="svc-pick-chips">
                              {items.map((s) => {
                                const on = form.serviceIds.includes(s.id);
                                return (
                                  <label key={s.id} className={`chip${on ? ' on' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={on}
                                      onChange={() => toggleService(s.id)}
                                    />
                                    <span className="chip-check">
                                      <svg viewBox="0 0 14 14" aria-hidden="true">
                                        <circle cx="7" cy="7" r="6" />
                                        <path d="M4.3 7.2l1.9 1.9 3.5-3.8" />
                                      </svg>
                                    </span>
                                    <span className="chip-label">{t(s.name_fr, s.name_ar)}</span>
                                    <em>{s.price_is_from ? `${t('dès', 'من')} ` : ''}{s.price_tnd} TND</em>
                                  </label>
                                );
                              })}
                            </div>
                          </details>
                        );
                      })}
                      <div className="svc-pick-group">
                        <div className="svc-pick-chips">
                          <label className={`chip${otherSelected ? ' on' : ''}`}>
                            <input
                              type="checkbox"
                              checked={otherSelected}
                              onChange={() => toggleService(OTHER_ID)}
                            />
                            <span className="chip-check">
                              <svg viewBox="0 0 14 14" aria-hidden="true">
                                <circle cx="7" cy="7" r="6" />
                                <path d="M4.3 7.2l1.9 1.9 3.5-3.8" />
                              </svg>
                            </span>
                            <span className="chip-label">{t('Autre / Je ne sais pas encore', 'أخرى / لم أقرر بعد')}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    {selectedLabels.length > 0 && (
                      <div className="svc-pick-summary">
                        {selectedLabels.length} {t('sélectionné(s)', 'مختارة')}
                        {selectedTotal > 0 ? ` · ${totalPrefix}${selectedTotal} TND` : ''}
                      </div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="form-row">
                    <label>{t('Date souhaitée', 'التاريخ المفضل')}</label>
                    <CalendarPicker
                      value={form.date}
                      onChange={handleDateSelect}
                      hours={hours}
                      lang={lang}
                    />
                    {availability?.is_closed && (
                      <div className="cal-closed-msg">
                        {t('Fermé ce jour — veuillez choisir une autre date.', 'مغلق في هذا اليوم — يرجى اختيار تاريخ آخر.')}
                      </div>
                    )}
                    {availability && !availability.is_closed && availability.open_time && (
                      <div className="cal-hours-msg">
                        {t(`Ouvert de ${availability.open_time} à ${availability.close_time}`, `مفتوح من ${availability.open_time} إلى ${availability.close_time}`)}
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="form-row">
                    <label>{t('Heure souhaitée par soin', 'الوقت المفضل لكل عناية')}</label>
                    {renderTimeStep()}
                  </div>
                )}

                {step === 4 && (
                  <>
                    <div className="confirm-summary">
                      <div className="confirm-row">
                        <span className="confirm-k">{t('Soins', 'العنايات')}</span>
                        <span className="confirm-v">
                          {selectedLabels.join(' · ')}{selectedTotal > 0 ? ` · ${totalPrefix}${selectedTotal} TND` : ''}
                        </span>
                      </div>
                      <div className="confirm-row">
                        <span className="confirm-k">{t('Date', 'التاريخ')}</span>
                        <span className="confirm-v">{formatDate(form.date)}</span>
                      </div>
                      <div className="confirm-row confirm-total">
                        <span className="confirm-k">{t('Total', 'المجموع')}</span>
                        <span className="confirm-v">{selectedTotal > 0 ? `${totalPrefix}${selectedTotal} TND` : t('À confirmer', 'يُحدد لاحقاً')}</span>
                      </div>
                      {catSlugsForTime.length > 0 && Object.keys(form.times).length > 0 && (
                        <div className="confirm-row confirm-plan">
                          <span className="confirm-k">{t('Programme', 'البرنامج')}</span>
                          <span className="confirm-v">
                            {planOrder.map((slug) => (
                              <span key={slug} className="confirm-plan-line">
                                {catName(slug)} · {form.times[slug] || t('à choisir', 'يُختار')}
                              </span>
                            ))}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="form-two">
                      <div className="form-row">
                        <label>{t('Nom complet', 'الاسم الكامل')}</label>
                        <input type="text" name="name" value={form.name} onChange={handleChange} />
                      </div>
                      <div className="form-row">
                        <label>{t('Téléphone', 'الهاتف')}</label>
                        <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+216" />
                      </div>
                    </div>
                    <div className="form-row">
                      <label>{t('Message (optionnel)', 'ملاحظة (اختياري)')}</label>
                      <textarea name="message" value={form.message} onChange={handleChange}></textarea>
                    </div>
                    <p className="form-note">{t('Fermé le lundi — nous répondons généralement sous quelques heures.', 'مغلق يوم الاثنين — نرد عادة خلال ساعات قليلة.')}</p>
                  </>
                )}
              </div>

              {stepError && (
                <div className="wiz-error" role="alert">{stepError}</div>
              )}

              {step < 4 ? (
                <div className="wiz-nav">
                  {step > 1 && (
                    <button type="button" className="wiz-back" onClick={goBack}>
                      <span className="wiz-arrow">←</span> {t('Retour', 'رجوع')}
                    </button>
                  )}
                  <button type="button" className="wiz-next" onClick={goNext}>
                    {t('Suivant', 'التالي')} <span className="wiz-arrow">→</span>
                  </button>
                </div>
              ) : (
                <div className="wiz-nav">
                  <button type="button" className="wiz-back" onClick={goBack}>
                    <span className="wiz-arrow">←</span> {t('Retour', 'رجوع')}
                  </button>
                  <button type="submit" className="wiz-next wiz-whatsapp" disabled={status === 'sending'}>
                    <MessageCircle size={18} aria-hidden="true" />
                    {status === 'sending' ? t('Enregistrement...', 'جارٍ التسجيل...') : t('Réserver via WhatsApp', 'احجزي عبر واتساب')}
                  </button>
                </div>
              )}
                </form>
                </>
                )}
              </>
            </div>
            )}
        </div>
      </div>
    </section>
  );
}