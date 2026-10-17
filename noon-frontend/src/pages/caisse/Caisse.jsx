import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, getCaisseSession, setCaisseSession } from '../../api';
import logo from '../../assets/logo.png';
import { PAYMENT_LABELS, money, printHtml, receiptHtml, summaryHtml } from './receipt';
import './caisse.css';

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;
let lineSeq = 0;
const newLine = (fields) => ({ key: ++lineSeq, quantity: 1, ...fields });

function emptyTicket() {
  return { lines: [], clientName: '', clientPhone: '', bookingId: null, discountType: 'amount', discountValue: '' };
}

// Quick "amount received" buttons: exact, then the next round banknote amounts.
function cashSuggestions(due) {
  const out = [due];
  for (const step of [5, 10, 20, 50, 100]) {
    const v = Math.ceil(due / step) * step;
    if (v > due && !out.includes(v)) out.push(v);
  }
  return out.slice(0, 5);
}

export default function Caisse() {
  const navigate = useNavigate();
  const session = getCaisseSession();
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [activeCat, setActiveCat] = useState(null);
  const [ticket, setTicket] = useState(emptyTicket);
  const [panel, setPanel] = useState(null); // null | 'bookings' | 'sales' | 'summary' | 'custom' | 'pay' | 'done'
  const [bookings, setBookings] = useState([]);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [lastSale, setLastSale] = useState(null);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    function onExpired() { navigate('/caisse/login', { replace: true }); }
    window.addEventListener('noon:caisse-session-expired', onExpired);
    return () => window.removeEventListener('noon:caisse-session-expired', onExpired);
  }, [navigate]);

  useEffect(() => {
    if (!session?.token) return;
    Promise.all([api.getCategories(), api.getSettings(), api.getCaisseBookings()])
      .then(([cats, s, b]) => {
        const visible = cats
          .map((c) => ({ ...c, services: c.services.filter((x) => x.is_active) }))
          .filter((c) => c.services.length);
        setCategories(visible);
        setActiveCat(visible[0]?.id ?? null);
        setSettings(s);
        setBookings(b);
      })
      .catch((e) => setLoadError(e.message || 'Impossible de charger la caisse.'));
  }, [session?.token]);

  const servicesById = useMemo(() => {
    const map = new Map();
    categories.forEach((c) => c.services.forEach((s) => map.set(s.id, s)));
    return map;
  }, [categories]);

  if (!session?.token) return <Navigate to="/caisse/login" replace />;

  const subtotal = round2(ticket.lines.reduce((sum, l) => sum + Number(l.unit_price) * l.quantity, 0));
  const discountInput = Number(ticket.discountValue) || 0;
  const discount = Math.min(
    subtotal,
    round2(ticket.discountType === 'percent' ? (subtotal * Math.min(discountInput, 100)) / 100 : discountInput),
  );
  const total = round2(subtotal - discount);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  }

  function addService(svc) {
    setTicket((t) => {
      const existing = t.lines.find((l) => l.service_id === svc.id);
      if (existing) {
        return { ...t, lines: t.lines.map((l) => (l === existing ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l)) };
      }
      return { ...t, lines: [...t.lines, newLine({ service_id: svc.id, name: svc.name_fr, unit_price: Number(svc.price_tnd), price_is_from: svc.price_is_from })] };
    });
  }

  function changeQty(key, delta) {
    setTicket((t) => ({
      ...t,
      lines: t.lines
        .map((l) => (l.key === key ? { ...l, quantity: Math.min(99, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0),
    }));
  }

  function loadBooking(b) {
    const lines = b.service_ids.map((id) => servicesById.get(id)).filter(Boolean)
      .map((svc) => newLine({ service_id: svc.id, name: svc.name_fr, unit_price: Number(svc.price_tnd), price_is_from: svc.price_is_from }));
    setTicket({ ...emptyTicket(), lines, clientName: b.name, clientPhone: b.phone, bookingId: b.id });
    setPanel(null);
    if (!lines.length) flash('Services de la réservation non reconnus : ajoutez-les à la main.');
  }

  async function openPanel(name) {
    setPanel(name);
    try {
      if (name === 'bookings') setBookings(await api.getCaisseBookings());
      if (name === 'sales') setSales(await api.getCaisseSales());
      if (name === 'summary') setSummary(await api.getCaisseSummary());
    } catch (e) {
      flash(e.message || 'Chargement impossible.');
    }
  }

  async function logout() {
    try { await api.caisseLogout(); } catch { /* token may already be gone */ }
    setCaisseSession(null);
    navigate('/caisse/login', { replace: true });
  }

  async function submitPayment(payment) {
    const body = {
      lines: ticket.lines.map((l) => (l.service_id
        ? { service_id: l.service_id, quantity: l.quantity }
        : { name: l.name, unit_price: l.unit_price.toFixed(2), quantity: l.quantity })),
      discount_type: ticket.discountType,
      discount_value: discountInput.toFixed(2),
      booking_id: ticket.bookingId,
      client_name: ticket.clientName.trim(),
      client_phone: ticket.clientPhone.trim(),
      ...payment,
    };
    const sale = await api.createSale(body);
    setLastSale(sale);
    setTicket(emptyTicket());
    setPanel('done');
    if (sale.booking) setBookings((list) => list.filter((b) => b.id !== sale.booking));
    printHtml(receiptHtml(sale, settings));
  }

  const cat = categories.find((c) => c.id === activeCat);
  const linkedBooking = ticket.bookingId && (bookings.find((b) => b.id === ticket.bookingId) || { name: ticket.clientName });

  return (
    <div className="caisse">
      <header className="caisse-top">
        <div className="caisse-brand">
          <img src={logo} alt="" />
          <span>NOON Caisse</span>
        </div>
        <div className="caisse-top-actions">
          <button className="caisse-chip" onClick={() => openPanel('bookings')}>
            Réservations du jour {bookings.length > 0 && <b className="caisse-badge">{bookings.length}</b>}
          </button>
          <button className="caisse-chip" onClick={() => openPanel('sales')}>Ventes du jour</button>
          <button className="caisse-chip" onClick={() => openPanel('summary')}>Clôture</button>
          <button className="caisse-chip caisse-chip-ghost" onClick={logout}>{session.name} · Quitter</button>
        </div>
      </header>

      {loadError && <div className="caisse-error">{loadError}</div>}
      {notice && <div className="caisse-notice" role="status">{notice}</div>}

      <div className="caisse-body">
        <section className="caisse-catalog">
          <div className="caisse-cats">
            {categories.map((c) => (
              <button key={c.id} className={`caisse-cat ${c.id === activeCat ? 'active' : ''}`} onClick={() => setActiveCat(c.id)}>
                {c.name_fr}
              </button>
            ))}
            <button className="caisse-cat caisse-cat-custom" onClick={() => setPanel('custom')}>+ Article libre</button>
          </div>
          <div className="caisse-grid">
            {cat?.services.map((s) => (
              <button key={s.id} className={`caisse-item ${s.is_package ? 'is-package' : ''}`} onClick={() => addService(s)}>
                {s.is_package && <span className="caisse-item-tag">Forfait</span>}
                <span className="caisse-item-name">{s.name_fr}</span>
                <span className="caisse-item-price">{s.price_is_from ? 'dès ' : ''}{money(s.price_tnd)}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="caisse-ticket">
          {linkedBooking ? (
            <div className="caisse-booking-tag">
              <span>Réservation : <b>{linkedBooking.name}</b></span>
              <button onClick={() => setTicket((t) => ({ ...t, bookingId: null }))} aria-label="Détacher la réservation">✕</button>
            </div>
          ) : null}
          <div className="caisse-client">
            <input placeholder="Nom du client" value={ticket.clientName}
              onChange={(e) => setTicket((t) => ({ ...t, clientName: e.target.value }))} />
            <input placeholder="Téléphone" inputMode="tel" value={ticket.clientPhone}
              onChange={(e) => setTicket((t) => ({ ...t, clientPhone: e.target.value }))} />
          </div>

          <div className="caisse-lines">
            {ticket.lines.length === 0 && <p className="caisse-empty">Touchez un service pour l’ajouter au ticket.</p>}
            {ticket.lines.map((l) => (
              <div className="caisse-line" key={l.key}>
                <div className="caisse-line-name">
                  {l.name}
                  <small>{money(l.unit_price)}{l.price_is_from ? ' (prix de base)' : ''}</small>
                </div>
                <div className="caisse-qty">
                  <button onClick={() => changeQty(l.key, -1)} aria-label="Retirer un">−</button>
                  <span>{l.quantity}</span>
                  <button onClick={() => changeQty(l.key, 1)} aria-label="Ajouter un">+</button>
                </div>
                <div className="caisse-line-total">{money(l.unit_price * l.quantity)}</div>
              </div>
            ))}
          </div>

          <div className="caisse-discount">
            <span>Remise</span>
            <div className="caisse-seg">
              <button className={ticket.discountType === 'amount' ? 'active' : ''} onClick={() => setTicket((t) => ({ ...t, discountType: 'amount' }))}>TND</button>
              <button className={ticket.discountType === 'percent' ? 'active' : ''} onClick={() => setTicket((t) => ({ ...t, discountType: 'percent' }))}>%</button>
            </div>
            <input inputMode="decimal" placeholder="0" value={ticket.discountValue}
              onChange={(e) => setTicket((t) => ({ ...t, discountValue: e.target.value.replace(/[^\d.,]/g, '').replace(',', '.') }))} />
          </div>

          <div className="caisse-totals">
            {discount > 0 && <div><span>Sous-total</span><span>{money(subtotal)}</span></div>}
            {discount > 0 && <div><span>Remise</span><span>− {money(discount)}</span></div>}
            <div className="caisse-total"><span>Total</span><span>{money(total)}</span></div>
          </div>

          <div className="caisse-ticket-actions">
            <button className="caisse-btn caisse-btn-ghost" disabled={!ticket.lines.length && !ticket.bookingId}
              onClick={() => setTicket(emptyTicket())}>Vider</button>
            <button className="caisse-btn caisse-btn-primary" disabled={!ticket.lines.length}
              onClick={() => setPanel('pay')}>Encaisser {money(total)}</button>
          </div>
        </aside>
      </div>

      {panel === 'pay' && <PaymentModal total={total} onClose={() => setPanel(null)} onPay={submitPayment} />}
      {panel === 'custom' && (
        <CustomItemModal
          onClose={() => setPanel(null)}
          onAdd={(item) => { setTicket((t) => ({ ...t, lines: [...t.lines, newLine(item)] })); setPanel(null); }}
        />
      )}
      {panel === 'done' && lastSale && (
        <Modal title="Paiement enregistré" onClose={() => setPanel(null)}>
          <div className="caisse-done">
            <div className="caisse-done-mark">✓</div>
            <p>Ticket N° {lastSale.number} · {money(lastSale.total)} · {PAYMENT_LABELS[lastSale.payment_method]}</p>
            {Number(lastSale.change_given) > 0 && <p className="caisse-change">À rendre : <b>{money(lastSale.change_given)}</b></p>}
          </div>
          <div className="caisse-modal-actions">
            <button className="caisse-btn caisse-btn-ghost" onClick={() => printHtml(receiptHtml(lastSale, settings))}>Réimprimer</button>
            <button className="caisse-btn caisse-btn-primary" onClick={() => setPanel(null)}>Nouveau ticket</button>
          </div>
        </Modal>
      )}
      {panel === 'bookings' && (
        <Modal title="Réservations du jour" onClose={() => setPanel(null)}>
          {bookings.length === 0 && <p className="caisse-empty">Aucune réservation à encaisser aujourd’hui.</p>}
          <div className="caisse-list">
            {bookings.map((b) => (
              <button key={b.id} className="caisse-list-row" onClick={() => loadBooking(b)}>
                <span className="caisse-list-time">{b.preferred_time || '—'}</span>
                <span className="caisse-list-main"><b>{b.name}</b><small>{b.phone} · {b.service_label || 'Services non précisés'}</small></span>
                <span className="caisse-list-cta">Encaisser →</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {panel === 'sales' && (
        <SalesModal sales={sales} settings={settings} onClose={() => setPanel(null)}
          onCancelled={(sale) => setSales((list) => list.map((s) => (s.id === sale.id ? sale : s)))} flash={flash} />
      )}
      {panel === 'summary' && (
        <Modal title="Clôture de caisse" onClose={() => setPanel(null)}>
          {!summary ? <p className="caisse-empty">Chargement…</p> : (
            <>
              <div className="caisse-stats">
                <div><small>Total encaissé</small><b>{money(summary.total)}</b></div>
                <div><small>Espèces</small><b>{money(summary.cash_total)}</b></div>
                <div><small>Carte</small><b>{money(summary.card_total)}</b></div>
                <div><small>Tickets</small><b>{summary.count}</b></div>
                <div><small>Remises</small><b>{money(summary.discount_total)}</b></div>
                <div><small>Annulés</small><b>{summary.cancelled_count}</b></div>
              </div>
              <div className="caisse-modal-actions">
                <button className="caisse-btn caisse-btn-primary" onClick={() => printHtml(summaryHtml(summary, settings))}>Imprimer la clôture</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="caisse-overlay" onClick={onClose}>
      <div className="caisse-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="caisse-modal-head">
          <h3>{title}</h3>
          <button onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PaymentModal({ total, onClose, onPay }) {
  const [method, setMethod] = useState('cash');
  const [received, setReceived] = useState(String(total));
  const [card, setCard] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const cardPart = method === 'card' ? total : method === 'mixed' ? round2(card) : 0;
  const cashDue = round2(total - cardPart);
  const receivedNum = round2(received);
  const change = round2(receivedNum - cashDue);
  const valid = method === 'card'
    || (method === 'cash' && receivedNum >= cashDue)
    || (method === 'mixed' && cardPart > 0 && cardPart < total && receivedNum >= cashDue);

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      const payment = { payment_method: method };
      if (method !== 'card') payment.cash_received = receivedNum.toFixed(2);
      if (method === 'mixed') payment.card_amount = cardPart.toFixed(2);
      await onPay(payment);
    } catch (e) {
      setError(e.message || 'Paiement non enregistré.');
      setBusy(false);
    }
  }

  const numeric = (setter) => (e) => setter(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'));

  return (
    <Modal title={`Encaisser ${money(total)}`} onClose={busy ? () => {} : onClose}>
      <div className="caisse-methods">
        {['cash', 'card', 'mixed'].map((m) => (
          <button key={m} className={`caisse-method ${method === m ? 'active' : ''}`}
            onClick={() => { setMethod(m); setReceived(String(m === 'mixed' ? '' : total)); setCard(''); }}>
            {PAYMENT_LABELS[m]}
          </button>
        ))}
      </div>

      {method === 'mixed' && (
        <label className="caisse-field">
          <span>Part payée par carte</span>
          <input inputMode="decimal" value={card} onChange={numeric(setCard)} placeholder="0.00" autoFocus />
          <small>Reste en espèces : {money(cashDue)}</small>
        </label>
      )}

      {method !== 'card' && (
        <>
          <label className="caisse-field">
            <span>Espèces reçues</span>
            <input inputMode="decimal" value={received} onChange={numeric(setReceived)} placeholder="0.00" />
          </label>
          {cashDue > 0 && (
            <div className="caisse-quick">
              {cashSuggestions(cashDue).map((v) => (
                <button key={v} onClick={() => setReceived(String(v))}>{v === cashDue ? 'Exact' : `${v} TND`}</button>
              ))}
            </div>
          )}
          <div className={`caisse-change ${change < 0 ? 'is-short' : ''}`}>
            {change < 0 ? <>Manque : <b>{money(-change)}</b></> : <>À rendre : <b>{money(change)}</b></>}
          </div>
        </>
      )}

      {method === 'card' && <p className="caisse-empty">Passez la carte sur le terminal, puis validez ici.</p>}
      {error && <div className="caisse-error">{error}</div>}

      <div className="caisse-modal-actions">
        <button className="caisse-btn caisse-btn-ghost" onClick={onClose} disabled={busy}>Retour</button>
        <button className="caisse-btn caisse-btn-primary" disabled={!valid || busy} onClick={confirm}>
          {busy ? 'Enregistrement…' : 'Valider le paiement'}
        </button>
      </div>
    </Modal>
  );
}

function CustomItemModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const priceNum = round2(price);
  return (
    <Modal title="Article libre" onClose={onClose}>
      <label className="caisse-field">
        <span>Désignation</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. shampooing, carte cadeau…" autoFocus />
      </label>
      <label className="caisse-field">
        <span>Prix (TND)</span>
        <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))} placeholder="0.00" />
      </label>
      <div className="caisse-modal-actions">
        <button className="caisse-btn caisse-btn-ghost" onClick={onClose}>Retour</button>
        <button className="caisse-btn caisse-btn-primary" disabled={!name.trim() || priceNum <= 0}
          onClick={() => onAdd({ name: name.trim(), unit_price: priceNum })}>Ajouter au ticket</button>
      </div>
    </Modal>
  );
}

function SalesModal({ sales, settings, onClose, onCancelled, flash }) {
  const [cancelling, setCancelling] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirmCancel() {
    setBusy(true);
    try {
      onCancelled(await api.cancelSale(cancelling.id, reason.trim()));
      setCancelling(null);
      setReason('');
      flash('Ticket annulé.');
    } catch (e) {
      flash(e.message || 'Annulation impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Ventes du jour" onClose={onClose}>
      {sales.length === 0 && <p className="caisse-empty">Aucune vente aujourd’hui.</p>}
      <div className="caisse-list">
        {sales.map((s) => (
          <div key={s.id} className={`caisse-list-row is-static ${s.status === 'cancelled' ? 'is-cancelled' : ''}`}>
            <span className="caisse-list-time">{new Date(s.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="caisse-list-main">
              <b>N° {s.number} · {money(s.total)}</b>
              <small>{PAYMENT_LABELS[s.payment_method]} · {s.client_name || 'Client de passage'}{s.status === 'cancelled' ? ` · ANNULÉ (${s.cancel_reason})` : ''}</small>
            </span>
            <span className="caisse-row-actions">
              <button onClick={() => printHtml(receiptHtml(s, settings))}>Imprimer</button>
              {s.status === 'paid' && <button className="danger" onClick={() => { setCancelling(s); setReason(''); }}>Annuler</button>}
            </span>
          </div>
        ))}
      </div>
      {cancelling && (
        <div className="caisse-cancel-box">
          <label className="caisse-field">
            <span>Motif d’annulation du ticket N° {cancelling.number}</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. erreur de saisie" autoFocus />
          </label>
          <div className="caisse-modal-actions">
            <button className="caisse-btn caisse-btn-ghost" onClick={() => setCancelling(null)} disabled={busy}>Garder le ticket</button>
            <button className="caisse-btn caisse-btn-danger" disabled={!reason.trim() || busy} onClick={confirmCancel}>Annuler le ticket</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
