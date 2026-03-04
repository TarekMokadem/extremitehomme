import JsBarcode from 'jsbarcode';
import type { Product } from '../types/database';

export function generateEAN13(): string {
  let digits = '200';
  for (let i = 0; i < 9; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return digits + checkDigit.toString();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateBarcodeSvg(barcode: string): string {
  if (typeof document === 'undefined') return '';
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const format = /^\d{12,13}$/.test(barcode) ? 'EAN13' : 'CODE128';
    JsBarcode(svg, barcode, {
      format,
      width: 1.2,
      height: 28,
      displayValue: false,
      margin: 0,
    });
    return svg.outerHTML;
  } catch {
    return '';
  }
}

const LABELS_PER_PAGE = 24;

function generateLabelHtml(product: Product): string {
  const priceTtc = (product.price_ttc ?? 0).toFixed(2);
  const barcodeStr = product.barcode || '';
  const barcodeSvg = barcodeStr ? generateBarcodeSvg(barcodeStr) : '';
  return `<div class="label">
  <div class="price">${priceTtc} &euro;</div>
  ${product.size ? `<div class="size">Taille : ${escapeHtml(product.size)}</div>` : ''}
  <div class="name">${escapeHtml(product.name)}</div>
  ${product.brand ? `<div class="brand">${escapeHtml(product.brand)}</div>` : ''}
  ${barcodeSvg ? `<div class="barcode-container">${barcodeSvg}</div>` : ''}
  ${barcodeStr ? `<div class="barcode-num">${barcodeStr}</div>` : ''}
</div>`;
}

export function printBarcodeLabels(product: Product, quantity: number = 24): void {
  printBarcodeLabelsMultiple([{ product, quantity }]);
}

export interface LabelItem {
  product: Product;
  quantity: number;
}

/** Imprime les étiquettes de plusieurs produits/tailles à la suite (une page A4 = 24 étiquettes) */
export function printBarcodeLabelsMultiple(items: LabelItem[]): void {
  const labelHtml = generateLabelHtml;
  const allLabels: string[] = [];
  for (const { product, quantity } of items) {
    const singleLabel = labelHtml(product);
    for (let i = 0; i < quantity; i++) {
      allLabels.push(singleLabel);
    }
  }

  if (allLabels.length === 0) return;

  const pageHtmls: string[] = [];
  for (let p = 0; p < allLabels.length; p += LABELS_PER_PAGE) {
    const pageLabels = allLabels.slice(p, p + LABELS_PER_PAGE);
    let gridHtml = pageLabels.join('\n');
    for (let i = pageLabels.length; i < LABELS_PER_PAGE; i++) {
      gridHtml += '\n<div class="label"></div>';
    }
    pageHtmls.push(`<div class="labels-grid"${p + LABELS_PER_PAGE < allLabels.length ? ' style="page-break-after: always;"' : ''}>
${gridHtml}
</div>`);
  }

  const productNames = [...new Set(items.map((i) => i.product.name))].join(', ');
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Étiquettes - ${escapeHtml(productNames)}</title>
<style>
@page { size: A4; margin: 5mm; }
body { margin: 0; padding: 0; }
.labels-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(8, 1fr); width: 210mm; height: 297mm; gap: 0; }
.label { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 0.5px dashed #ccc; padding: 2mm; text-align: center; font-family: Arial, sans-serif; overflow: hidden; }
.label .price { font-size: 16pt; font-weight: bold; }
.label .size { font-size: 12pt; }
.label .name { font-size: 8pt; }
.label .brand { font-size: 7pt; color: #555; }
.label .barcode-num { font-size: 8pt; font-family: monospace; }
.label .barcode-container { margin: 2px 0; line-height: 0; }
.label .barcode-container svg { max-width: 100%; height: auto; }
</style>
</head><body>
${pageHtmls.join('\n')}
</body></html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
