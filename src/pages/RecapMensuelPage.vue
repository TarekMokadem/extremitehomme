<script setup lang="ts">
import { ref, computed } from 'vue';
import { Calculator, Printer, Download, RefreshCw, Users, ShoppingCart, TrendingUp, Receipt } from 'lucide-vue-next';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface SaleRow {
  id: string;
  ticket_number: string;
  total: number;
  discount_amount: number;
  created_at: string;
  client?: { first_name: string; last_name: string } | null;
  vendor?: { first_name: string; last_name: string } | null;
  items?: { id: string; product_name: string; quantity: number; subtotal_ttc: number; is_free?: boolean }[];
  payments?: { method: string; amount: number }[];
}

interface DayGroup {
  date: string;
  label: string;
  sales: SaleRow[];
  subtotal: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
  card: 'CB',
  contactless: 'Sans contact',
  amex: 'Amex',
  check: 'Chèque',
  gift_card: 'Chèque Cadeau',
  free: 'Gratuit',
};

const PAYMENT_METHODS = Object.keys(PAYMENT_LABELS);

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const SHORT_MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth());
const isLoading = ref(false);
const sales = ref<SaleRow[]>([]);
const hasLoaded = ref(false);

const yearOptions = computed(() => {
  const current = new Date().getFullYear();
  return [current - 2, current - 1, current, current + 1];
});

const periodLabel = computed(() => `${MONTH_NAMES[selectedMonth.value]} ${selectedYear.value}`);

const totalCA = computed(() => sales.value.reduce((s, sale) => s + sale.total, 0));
const salesCount = computed(() => sales.value.length);
const avgBasket = computed(() => (salesCount.value > 0 ? totalCA.value / salesCount.value : 0));

const uniqueClients = computed(() => {
  const ids = new Set<string>();
  for (const sale of sales.value) {
    if (sale.client) {
      ids.add(`${sale.client.first_name}_${sale.client.last_name}`);
    }
  }
  return ids.size;
});

const paymentSummary = computed(() => {
  const map: Record<string, { amount: number; count: number }> = {};
  for (const m of PAYMENT_METHODS) {
    map[m] = { amount: 0, count: 0 };
  }
  for (const sale of sales.value) {
    const payments = sale.payments || [];
    const items = sale.items || [];
    const isFreeSale = sale.total === 0;
    if (isFreeSale && payments.length === 0) {
      const gratuitTheorique = items.reduce((s, i) => s + (i.subtotal_ttc ?? 0), 0);
      map['free'].amount += gratuitTheorique;
      map['free'].count += 1;
    } else {
      let gratuitTheorique = 0;
      for (const item of items) {
        if (item.is_free === true) gratuitTheorique += item.subtotal_ttc ?? 0;
      }
      if (gratuitTheorique > 0) {
        map['free'].amount += gratuitTheorique;
        map['free'].count += 1;
      }
      for (const p of payments) {
        const method = p.method as string;
        if (!map[method]) map[method] = { amount: 0, count: 0 };
        map[method].amount += p.amount ?? 0;
        map[method].count += 1;
      }
    }
  }
  return PAYMENT_METHODS.map(method => ({
    method,
    label: PAYMENT_LABELS[method] ?? method,
    amount: map[method]?.amount ?? 0,
    count: map[method]?.count ?? 0,
  })).filter(r => r.count > 0 || PAYMENT_METHODS.includes(r.method));
});

const paymentTotalAmount = computed(() => paymentSummary.value.reduce((s, r) => s + r.amount, 0));
const paymentTotalCount = computed(() => paymentSummary.value.reduce((s, r) => s + r.count, 0));

const dayGroups = computed<DayGroup[]>(() => {
  const map = new Map<string, SaleRow[]>();
  for (const sale of sales.value) {
    const d = formatDateShort(sale.created_at);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(sale);
  }
  const groups: DayGroup[] = [];
  for (const [date, daySales] of map) {
    groups.push({
      date,
      label: date,
      sales: daySales,
      subtotal: daySales.reduce((s, sale) => s + sale.total, 0),
    });
  }
  return groups;
});

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatPrice(n: number): string {
  return n.toFixed(2);
}

function getPaymentLabels(sale: SaleRow): string {
  const payments = sale.payments || [];
  if (sale.total === 0 && payments.length === 0) return 'Gratuit';
  if (payments.length === 0) return '—';
  return payments.map(p => PAYMENT_LABELS[p.method] ?? p.method).join(', ');
}

function getArticlesSummary(items?: { id: string; product_name: string; quantity: number; subtotal_ttc: number }[]): string {
  if (!items || items.length === 0) return '—';
  return items.map(i => `${i.quantity}x ${i.product_name}`).join(', ');
}

function getClientName(client?: { first_name: string; last_name: string } | null): string {
  if (!client) return '—';
  return `${client.first_name} ${client.last_name}`.trim() || '—';
}

function getVendorName(vendor?: { first_name: string; last_name: string } | null): string {
  if (!vendor) return '—';
  return `${vendor.first_name} ${vendor.last_name}`.trim() || '—';
}

function getSaleVendorSummary(sale: SaleRow): string {
  const items = sale.items || [];
  const names = new Set<string>();
  for (const item of items) {
    const v = (item as { vendor?: { first_name: string; last_name: string } }).vendor;
    if (v) names.add(`${v.first_name} ${v.last_name}`.trim());
  }
  if (names.size === 0) return getVendorName(sale.vendor);
  return Array.from(names).join(', ');
}

async function loadData() {
  if (!isSupabaseConfigured()) {
    sales.value = [];
    hasLoaded.value = true;
    return;
  }

  isLoading.value = true;

  try {
    const year = selectedYear.value;
    const month = selectedMonth.value;
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('sales')
      .select(`
        id, ticket_number, total, discount_amount, created_at,
        client:clients(first_name, last_name),
        vendor:vendors(first_name, last_name),
        items:sale_items(id, product_name, quantity, subtotal_ttc, is_free, vendor:vendors(first_name, last_name)),
        payments:payments(method, amount)
      `)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .eq('status', 'completed')
      .order('created_at');

    if (error) throw error;
    sales.value = (data || []) as unknown as SaleRow[];
  } catch (err) {
    console.error('Erreur chargement recap mensuel:', err);
    sales.value = [];
  } finally {
    isLoading.value = false;
    hasLoaded.value = true;
  }
}

function handlePrint() {
  window.print();
}

function handleDownloadPDF() {
  const printContent = document.querySelector('.print-thermal-compact')?.parentElement?.parentElement;
  if (!printContent) {
    window.print();
    return;
  }

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Autorisez les pop-ups'); return; }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Récapitulatif ${periodLabel.value}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
  h1 { font-size: 18px; text-align: center; margin-bottom: 20px; }
  .summary { display: flex; gap: 20px; margin-bottom: 20px; }
  .summary-card { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center; }
  .summary-card .label { font-size: 11px; color: #666; text-transform: uppercase; }
  .summary-card .value { font-size: 20px; font-weight: bold; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; font-size: 11px; text-transform: uppercase; }
  .text-right { text-align: right; }
  .font-bold { font-weight: bold; }
  .section-title { font-size: 14px; font-weight: bold; margin: 16px 0 8px; }
  .total-row { background: #333; color: white; font-weight: bold; }
  .day-header { background: #f0f0f0; font-weight: bold; font-size: 11px; text-transform: uppercase; }
  .subtotal-row { background: #f8f8f8; font-weight: bold; }
</style>
</head><body>
<h1>Récapitulatif Mensuel — ${periodLabel.value}</h1>
<div class="summary">
  <div class="summary-card"><div class="label">Total CA</div><div class="value">${formatPrice(totalCA.value)} €</div></div>
  <div class="summary-card"><div class="label">Ventes</div><div class="value">${salesCount.value}</div></div>
  <div class="summary-card"><div class="label">Panier moyen</div><div class="value">${formatPrice(avgBasket.value)} €</div></div>
  <div class="summary-card"><div class="label">Clients uniques</div><div class="value">${uniqueClients.value}</div></div>
</div>

<div class="section-title">Modes de règlement</div>
<table>
<tr><th>Mode</th><th class="text-right">Montant</th><th class="text-right">Nb</th></tr>
${paymentSummary.value.map(r => `<tr><td>${r.label}</td><td class="text-right">${formatPrice(r.amount)} €</td><td class="text-right">${r.count}</td></tr>`).join('')}
<tr class="font-bold"><td>Total</td><td class="text-right">${formatPrice(paymentTotalAmount.value)} €</td><td class="text-right">${paymentTotalCount.value}</td></tr>
</table>

<div class="section-title">Journal des ventes</div>
<table>
<tr><th>Date</th><th>Heure</th><th>Ticket</th><th>Client</th><th>Vendeur</th><th>Articles</th><th>Paiement</th><th class="text-right">Total</th></tr>
${dayGroups.value.map(group => `
<tr class="day-header"><td colspan="8">${group.label}</td></tr>
${group.sales.map(sale => `<tr>
<td>${formatDateShort(sale.created_at)}</td>
<td>${formatTime(sale.created_at)}</td>
<td>${sale.ticket_number}</td>
<td>${getClientName(sale.client)}</td>
<td>${getSaleVendorSummary(sale)}</td>
<td>${getArticlesSummary(sale.items)}</td>
<td>${getPaymentLabels(sale)}</td>
<td class="text-right">${formatPrice(sale.total)} €</td>
</tr>`).join('')}
<tr class="subtotal-row"><td colspan="7" class="text-right">Sous-total ${group.label}</td><td class="text-right">${formatPrice(group.subtotal)} €</td></tr>
`).join('')}
<tr class="total-row"><td colspan="7" class="text-right">Total ${periodLabel.value}</td><td class="text-right">${formatPrice(totalCA.value)} €</td></tr>
</table>
</body></html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
</script>

<template>
  <main class="flex-1 p-4 lg:p-6 overflow-auto bg-gray-50 dark:bg-gray-900 print:bg-white print:p-4">
    <div class="max-w-6xl mx-auto space-y-6 print:max-w-none">

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:flex-row">
        <h1 class="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white print:text-black">
          Récapitulatif Mensuel
        </h1>
        <div class="flex gap-2">
          <button
            v-if="hasLoaded && sales.length > 0"
            @click="handlePrint"
            class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-emerald-600 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-emerald-500 transition-colors print:hidden"
          >
            <Printer class="w-4 h-4" />
            Imprimer
          </button>
          <button
            v-if="hasLoaded && sales.length > 0"
            @click="handleDownloadPDF"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors print:hidden"
          >
            <Download class="w-4 h-4" />
            Télécharger PDF
          </button>
        </div>
      </div>

      <!-- Period selector -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4 print:hidden">
        <div class="flex flex-wrap items-center gap-3">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Année :</label>
          <select
            v-model.number="selectedYear"
            class="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-emerald-500/30"
          >
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="(label, idx) in SHORT_MONTHS"
            :key="idx"
            @click="selectedMonth = idx"
            :class="[
              'px-3 py-2 text-sm font-medium rounded-xl transition-colors',
              selectedMonth === idx
                ? 'bg-gray-900 dark:bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            ]"
          >
            {{ label }}
          </button>
        </div>

        <button
          @click="loadData"
          :disabled="isLoading"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
        >
          <Calculator v-if="!isLoading" class="w-4 h-4" />
          <RefreshCw v-else class="w-4 h-4 animate-spin" />
          Calculer
        </button>
      </div>

      <!-- Print header -->
      <div class="hidden print:block text-center mb-4">
        <p class="text-lg font-bold">{{ periodLabel }}</p>
      </div>

      <div v-if="isLoading" class="flex justify-center py-12">
        <RefreshCw class="w-8 h-8 text-gray-400 animate-spin" />
      </div>

      <template v-else-if="hasLoaded">
        <!-- Summary cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 print:rounded-none print:shadow-none">
            <div class="flex items-center gap-2 mb-1">
              <TrendingUp class="w-4 h-4 text-emerald-500" />
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Total CA</p>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white print:text-black">{{ formatPrice(totalCA) }} €</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 print:rounded-none print:shadow-none">
            <div class="flex items-center gap-2 mb-1">
              <Receipt class="w-4 h-4 text-blue-500" />
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Ventes</p>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white print:text-black">{{ salesCount }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 print:rounded-none print:shadow-none">
            <div class="flex items-center gap-2 mb-1">
              <ShoppingCart class="w-4 h-4 text-orange-500" />
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Panier moyen</p>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white print:text-black">{{ formatPrice(avgBasket) }} €</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 print:rounded-none print:shadow-none">
            <div class="flex items-center gap-2 mb-1">
              <Users class="w-4 h-4 text-purple-500" />
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Clients uniques</p>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white print:text-black">{{ uniqueClients }}</p>
          </div>
        </div>

        <!-- Payment methods summary -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden print:rounded-none print:border print:shadow-none">
          <div class="px-4 py-3 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Récapitulatif par mode de règlement</h2>
          </div>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-600">
                <th class="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Mode de règlement</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Montant</th>
                <th class="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Nb</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="row in paymentSummary" :key="row.method" class="text-gray-900 dark:text-gray-100" :title="row.method === 'free' && row.amount > 0 ? 'CA théorique des ventes gratuites' : undefined">
                <td class="px-4 py-2">{{ row.label }}</td>
                <td class="px-4 py-2 text-right tabular-nums">{{ formatPrice(row.amount) }} €</td>
                <td class="px-4 py-2 text-right tabular-nums">{{ row.count }}</td>
              </tr>
              <tr class="font-bold bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-600">
                <td class="px-4 py-2">Total</td>
                <td class="px-4 py-2 text-right tabular-nums">{{ formatPrice(paymentTotalAmount) }} €</td>
                <td class="px-4 py-2 text-right tabular-nums">{{ paymentTotalCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Sales journal table -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden print:rounded-none print:border print:shadow-none">
          <div class="px-4 py-3 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Journal des ventes — {{ periodLabel }}
            </h2>
          </div>

          <div v-if="sales.length === 0" class="p-8 text-center">
            <Receipt class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
            <p class="text-gray-500 dark:text-gray-400 mt-2">Aucune vente pour ce mois</p>
          </div>

          <div v-else class="overflow-x-auto journal-content print-thermal-compact">
            <table class="w-full text-sm min-w-[900px]">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-600">
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Heure</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Ticket</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Client</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Vendeur</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Articles</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Paiement</th>
                  <th class="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Total</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in dayGroups" :key="group.date">
                  <tr class="bg-gray-100 dark:bg-gray-700/60">
                    <td colspan="8" class="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wider">
                      {{ group.label }}
                    </td>
                  </tr>
                  <tr
                    v-for="sale in group.sales"
                    :key="sale.id"
                    class="text-gray-900 dark:text-gray-100 border-b border-gray-50 dark:border-gray-700/40 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td class="px-3 py-2 tabular-nums">{{ formatDateShort(sale.created_at) }}</td>
                    <td class="px-3 py-2 tabular-nums">{{ formatTime(sale.created_at) }}</td>
                    <td class="px-3 py-2 font-mono text-xs">{{ sale.ticket_number }}</td>
                    <td class="px-3 py-2">{{ getClientName(sale.client) }}</td>
                    <td class="px-3 py-2">{{ getSaleVendorSummary(sale) }}</td>
                    <td class="px-3 py-2 max-w-[200px] truncate" :title="getArticlesSummary(sale.items)">
                      {{ getArticlesSummary(sale.items) }}
                    </td>
                    <td class="px-3 py-2">{{ getPaymentLabels(sale) }}</td>
                    <td class="px-3 py-2 text-right tabular-nums font-medium">{{ formatPrice(sale.total) }} €</td>
                  </tr>
                  <tr class="bg-gray-50 dark:bg-gray-700/30 border-b-2 border-gray-200 dark:border-gray-600">
                    <td colspan="7" class="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Sous-total {{ group.label }}
                    </td>
                    <td class="px-3 py-2 text-right tabular-nums font-bold text-gray-900 dark:text-white">
                      {{ formatPrice(group.subtotal) }} €
                    </td>
                  </tr>
                </template>

                <tr class="bg-gray-900 dark:bg-emerald-900/40">
                  <td colspan="7" class="px-3 py-3 text-right font-bold text-white dark:text-emerald-300 uppercase tracking-wider text-sm">
                    Total {{ periodLabel }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums font-bold text-white dark:text-emerald-300 text-lg">
                    {{ formatPrice(totalCA) }} €
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
@media print {
  .journal-content { display: block !important; }
  .print\:hidden { display: none !important; }
  .print\:bg-white { background: white !important; }
  .print\:text-black { color: black !important; }
  .print\:rounded-none { border-radius: 0 !important; }
  .print\:border { border: 1px solid #e5e7eb !important; }
  .print\:shadow-none { box-shadow: none !important; }
  .print\:max-w-none { max-width: none !important; }
  .print\:flex-row { flex-direction: row !important; }
  .print\:grid-cols-4 { grid-template-columns: repeat(4, 1fr) !important; }
}
</style>
