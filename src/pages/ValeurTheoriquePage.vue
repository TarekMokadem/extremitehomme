<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Package, Printer, Download, RefreshCw } from 'lucide-vue-next';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface BrandRow {
  brand: string;
  count: number;
  totalHt: number;
  totalTtc: number;
}

const isLoading = ref(false);
const products = ref<Array<{
  brand: string | null;
  price_ht: number;
  price_ttc: number;
  stock: number;
}>>([]);

const brandRows = computed<BrandRow[]>(() => {
  const byBrand = new Map<string, { count: number; totalHt: number; totalTtc: number }>();
  for (const p of products.value) {
    const brand = p.brand?.trim() || 'Sans marque';
    const existing = byBrand.get(brand);
    const qty = p.stock ?? 0;
    const ht = (p.price_ht ?? 0) * qty;
    const ttc = (p.price_ttc ?? 0) * qty;
    if (existing) {
      existing.count += qty;
      existing.totalHt += ht;
      existing.totalTtc += ttc;
    } else {
      byBrand.set(brand, { count: qty, totalHt: ht, totalTtc: ttc });
    }
  }
  return Array.from(byBrand.entries())
    .map(([brand, data]) => ({
      brand,
      count: data.count,
      totalHt: data.totalHt,
      totalTtc: data.totalTtc,
    }))
    .sort((a, b) => a.brand.localeCompare(b.brand));
});

const grandTotal = computed(() => {
  return brandRows.value.reduce(
    (acc, row) => ({
      count: acc.count + row.count,
      totalHt: acc.totalHt + row.totalHt,
      totalTtc: acc.totalTtc + row.totalTtc,
    }),
    { count: 0, totalHt: 0, totalTtc: 0 }
  );
});

function formatPrice(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadData() {
  if (!isSupabaseConfigured()) {
    products.value = [];
    return;
  }
  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('brand, price_ht, price_ttc, stock')
      .eq('type', 'product');

    if (error) throw error;
    products.value = data ?? [];
  } catch (e) {
    console.error('Erreur chargement valeur théorique:', e);
    products.value = [];
  } finally {
    isLoading.value = false;
  }
}

function handlePrint() {
  window.print();
}

function handleDownloadPDF() {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Autorisez les pop-ups'); return; }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Valeur théorique du stock</title>
<style>
  body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
  h1 { font-size: 18px; text-align: center; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; font-size: 11px; text-transform: uppercase; }
  .text-right { text-align: right; }
  tfoot tr { background: #f5f5f5; font-weight: bold; }
</style>
</head><body>
<h1>Valeur théorique du stock</h1>
<table>
<thead><tr><th>Marque</th><th class="text-right">Nombre de produits</th><th class="text-right">Prix HT total</th><th class="text-right">Prix TTC total</th></tr></thead>
<tbody>
${brandRows.value.map(row => `<tr><td>${row.brand}</td><td class="text-right">${row.count.toLocaleString('fr-FR')}</td><td class="text-right">${formatPrice(row.totalHt)} €</td><td class="text-right">${formatPrice(row.totalTtc)} €</td></tr>`).join('')}
</tbody>
<tfoot><tr><td>Total</td><td class="text-right">${grandTotal.value.count.toLocaleString('fr-FR')}</td><td class="text-right">${formatPrice(grandTotal.value.totalHt)} €</td><td class="text-right">${formatPrice(grandTotal.value.totalTtc)} €</td></tr></tfoot>
</table>
</body></html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

onMounted(() => loadData());
</script>

<template>
  <main class="flex-1 p-4 lg:p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package class="w-7 h-7 text-gray-600 dark:text-gray-400" />
            Valeur théorique du stock
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Valeur totale du stock par marque (produits physiques uniquement)
          </p>
        </div>
        <div class="flex gap-2">
          <button
            @click="handlePrint"
            :disabled="isLoading || brandRows.length === 0"
            class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Printer class="w-4 h-4" />
            Imprimer
          </button>
          <button
            @click="handleDownloadPDF"
            :disabled="isLoading || brandRows.length === 0"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Download class="w-4 h-4" />
            Télécharger PDF
          </button>
          <button
            @click="loadData"
            :disabled="isLoading"
            class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw :class="['w-4 h-4', isLoading && 'animate-spin']" />
            Rafraîchir
          </button>
        </div>
      </div>

      <!-- Table card -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <!-- Loading -->
        <div v-if="isLoading && products.length === 0" class="flex justify-center py-20">
          <RefreshCw class="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin" />
        </div>

        <template v-else>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Marque
                  </th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-right">
                    Nombre de produits
                  </th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-right">
                    Prix HT total
                  </th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-right">
                    Prix TTC total
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr
                  v-for="row in brandRows"
                  :key="row.brand"
                  class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {{ row.brand }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right tabular-nums">
                    {{ row.count.toLocaleString('fr-FR') }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right tabular-nums">
                    {{ formatPrice(row.totalHt) }} €
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right tabular-nums">
                    {{ formatPrice(row.totalTtc) }} €
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-600">
                <tr>
                  <td class="px-4 py-3 font-bold text-gray-900 dark:text-white">
                    Total
                  </td>
                  <td class="px-4 py-3 font-bold text-gray-900 dark:text-white text-right tabular-nums">
                    {{ grandTotal.count.toLocaleString('fr-FR') }}
                  </td>
                  <td class="px-4 py-3 font-bold text-gray-900 dark:text-white text-right tabular-nums">
                    {{ formatPrice(grandTotal.totalHt) }} €
                  </td>
                  <td class="px-4 py-3 font-bold text-gray-900 dark:text-white text-right tabular-nums">
                    {{ formatPrice(grandTotal.totalTtc) }} €
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p v-if="!isLoading && brandRows.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
            Aucun produit physique en stock.
          </p>
        </template>
      </div>
    </div>
  </main>
</template>
