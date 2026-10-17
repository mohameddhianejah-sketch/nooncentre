// Receipt and end-of-day printing for 80 mm thermal printers. Printing goes
// through a hidden iframe so the receipt's page size never leaks into the
// rest of the site's print styles.

export const PAYMENT_LABELS = { cash: 'Espèces', card: 'Carte', mixed: 'Espèces + carte' };

export function money(value) {
  return `${Number(value || 0).toFixed(2)} TND`;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const STYLES = `
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body { margin: 0; width: 72mm; font: 12px/1.35 'Courier New', monospace; color: #000; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 2px; }
  .c { text-align: center; }
  .muted { font-size: 11px; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 1px 0; }
  td.r { text-align: right; white-space: nowrap; padding-left: 6px; }
  .total td { font-size: 15px; font-weight: bold; padding-top: 3px; }
  .cancelled { text-align: center; font-weight: bold; font-size: 14px; border: 2px solid #000; padding: 3px; margin: 6px 0; }
`;

function header(settings) {
  return `
    <h1>${esc(settings?.site_name || 'NOON Center')}</h1>
    ${settings?.address_fr ? `<div class="c muted">${esc(settings.address_fr)}</div>` : ''}
    ${settings?.phone ? `<div class="c muted">Tél. ${esc(settings.phone)}</div>` : ''}
    <hr>`;
}

function row(label, value, cls = '') {
  return `<tr class="${cls}"><td>${esc(label)}</td><td class="r">${esc(value)}</td></tr>`;
}

export function receiptHtml(sale, settings) {
  const when = new Date(sale.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  const lines = sale.lines.map((l) => `
    <tr><td>${l.quantity > 1 ? `${l.quantity} × ` : ''}${esc(l.name)}${l.quantity > 1 ? `<br><span class="muted">${money(l.unit_price)} / u</span>` : ''}</td>
    <td class="r">${money(l.line_total)}</td></tr>`).join('');
  const payment = [];
  if (Number(sale.card_amount) > 0) payment.push(row('Carte', money(sale.card_amount)));
  if (Number(sale.cash_amount) > 0) {
    payment.push(row('Espèces reçues', money(sale.cash_received)));
    payment.push(row('Rendu', money(sale.change_given)));
  }
  return `
    ${header(settings)}
    <table>
      ${row('Ticket', `N° ${sale.number}`)}
      ${row('Date', when)}
      ${row('Caisse', sale.cashier_name || '—')}
      ${sale.client_name ? row('Client', sale.client_name) : ''}
    </table>
    ${sale.status === 'cancelled' ? '<div class="cancelled">TICKET ANNULÉ</div>' : ''}
    <hr>
    <table>${lines}</table>
    <hr>
    <table>
      ${Number(sale.discount) > 0 ? row('Sous-total', money(sale.subtotal)) + row('Remise', `− ${money(sale.discount)}`) : ''}
      ${row('TOTAL', money(sale.total), 'total')}
      ${row('Paiement', PAYMENT_LABELS[sale.payment_method] || sale.payment_method)}
      ${payment.join('')}
    </table>
    <hr>
    <div class="c">Merci de votre visite !</div>`;
}

export function summaryHtml(summary, settings) {
  const day = new Date(`${summary.date}T00:00:00`).toLocaleDateString('fr-FR', { dateStyle: 'full' });
  const services = summary.services.map((s) => row(`${s.quantity} × ${s.name}`, money(s.total))).join('');
  const cashiers = summary.cashiers.map((c) => row(`${c.name} (${c.count})`, money(c.total))).join('');
  return `
    ${header(settings)}
    <div class="c"><b>CLÔTURE DE CAISSE</b></div>
    <div class="c muted">${esc(day)}</div>
    <div class="c muted">Imprimé le ${esc(new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }))}</div>
    <hr>
    <table>
      ${row('Tickets', summary.count)}
      ${row('Espèces', money(summary.cash_total))}
      ${row('Carte', money(summary.card_total))}
      ${row('Remises accordées', money(summary.discount_total))}
      ${row('Annulés', `${summary.cancelled_count} (${money(summary.cancelled_total)})`)}
      ${row('TOTAL ENCAISSÉ', money(summary.total), 'total')}
    </table>
    ${services ? `<hr><div><b>Prestations</b></div><table>${services}</table>` : ''}
    ${cashiers ? `<hr><div><b>Par caissière</b></div><table>${cashiers}</table>` : ''}
    <hr>`;
}

export function printHtml(body) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>${STYLES}</style></head><body>${body}</body></html>`);
  doc.close();
  const win = frame.contentWindow;
  const cleanup = () => setTimeout(() => frame.remove(), 500);
  win.addEventListener('afterprint', cleanup);
  setTimeout(() => {
    win.focus();
    win.print();
    // Some browsers never fire afterprint for iframes.
    setTimeout(cleanup, 60000);
  }, 50);
}
