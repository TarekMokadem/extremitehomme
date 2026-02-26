/**
 * Impression thermique – HOP-E801 (ESC/POS)
 *
 * Format ticket 80mm, style facture d'achat.
 * Utilise window.print() avec CSS adapté au rouleau thermique.
 */

export interface ReceiptItem {
  label: string;
  vendorName?: string;
  amount: number;
}

export interface ReceiptData {
  header: {
    name: string;
    address: string;
    city?: string;
    phone: string;
  };
  dateTime: string;
  items: ReceiptItem[];
  subtotal?: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  footer?: string;
}

function formatPrice(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

/**
 * Génère le HTML du ticket pour impression thermique 80mm.
 */
export function buildReceiptHTML(data: ReceiptData): string {
  const { header, dateTime, items, total, discount, footer } = data;

  const itemsHtml = items
    .map(
      (item) => `
    <div class="receipt-line">
      <span class="receipt-item">${escapeHtml(item.vendorName ? `${item.vendorName} ` : '')}${escapeHtml(item.label)}</span>
      <span class="receipt-price">${formatPrice(item.amount)}</span>
    </div>`
    )
    .join('');

  const discountHtml =
    discount != null && discount > 0
      ? `
    <div class="receipt-line receipt-total">
      <span class="receipt-item">Gratuit / Réduction</span>
      <span class="receipt-price">-${formatPrice(discount)}</span>
    </div>`
      : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket</title>
  <style>
    @page { size: 80mm 297mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.3;
      width: 80mm;
      max-width: 80mm;
      padding: 4mm;
      color: #000;
      background: #fff;
    }
    .receipt-header { text-align: center; margin-bottom: 6px; }
    .receipt-header .name { font-weight: bold; font-size: 14px; }
    .receipt-header .address, .receipt-header .phone { font-size: 11px; }
    .receipt-date { margin-bottom: 6px; font-size: 11px; }
    .receipt-line {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 2px;
      font-size: 11px;
    }
    .receipt-item { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .receipt-price { flex-shrink: 0; text-align: right; }
    .receipt-total { font-weight: bold; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #000; }
    .receipt-footer { text-align: center; margin-top: 8px; font-size: 11px; }
  </style>
</head>
<body>
  <div class="receipt-header">
    <div class="name">${escapeHtml(header.name)}</div>
    ${header.address ? `<div class="address">${escapeHtml(header.address)}</div>` : ''}
    ${header.city ? `<div class="address">${escapeHtml(header.city)}</div>` : ''}
    ${header.phone ? `<div class="phone">${escapeHtml(header.phone)}</div>` : ''}
  </div>
  <div class="receipt-date">${escapeHtml(dateTime)}</div>
  ${itemsHtml}
  ${discountHtml}
  <div class="receipt-line receipt-total">
    <span class="receipt-item">TOTAL</span>
    <span class="receipt-price">${formatPrice(total)} €</span>
  </div>
  ${footer ? `<div class="receipt-footer">${escapeHtml(footer)}</div>` : '<div class="receipt-footer">Merci de votre visite</div>'}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/**
 * Ouvre une fenêtre d'impression avec le ticket formaté pour thermique 80mm.
 */
export function printReceipt(data: ReceiptData): void {
  const html = buildReceiptHTML(data);
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    alert('Autorisez les pop-ups pour imprimer le ticket.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 250);
}
