<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  RefreshCw,
  Euro,
  ShoppingBag,
  BarChart3,
  Award,
  Users,
  Calculator,
  CreditCard,
  Scissors,
  Package,
  ChevronDown,
} from 'lucide-vue-next';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const route = useRoute();
const router = useRouter();

interface VendorOption {
  id: string;
  first_name: string;
  last_name: string;
  initials: string;
  color: string;
}

interface CategoryStat {
  name: string;
  count: number;
  amount: number;
}

interface ServiceStat {
  name: string;
  count: number;
  amount: number;
}

interface DailyStat {
  date: string;
  total: number;
  count: number;
}

interface PaymentStat {
  method: string;
  label: string;
  amount: number;
  count: number;
}

const CATEGORY_ORDER = [
  'Chaussure', 'Chaussette', 'Produit barbe', 'Produit cheveux',
  'Shampooing', 'Conditioner', 'Gel douche', 'Accessoire rasage',
  'Accessoire chaussure', 'Produit chaussure', 'Ceinture', 'Portefeuille',
  'Textile', 'Porte monnaie', 'Porte cartes', 'Sac', 'Noeud pap',
  'Cravate', 'Parfum', 'Echarpe', 'Produit esthetique', 'Trousse',
  'Bonnet', 'Casquette', 'Acomptes', 'Clients', 'ESTHETIQUE', 'PRESTATION',
];

const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
  card: 'Carte bancaire',
  contactless: 'Sans contact',
  check: 'Chèque',
  gift_card: 'Bon cadeau',
  amex: 'Amex',
  free: 'Gratuit',
  technical: 'Technique',
};

const vendors = ref<VendorOption[]>([]);
const selectedVendorId = ref<string>('');
const vendorDropdownOpen = ref(false);

const selectedYear = ref(new Date().getFullYear());
const selectedMonth = ref<number | null>(null);
const customStart = ref('');
const customEnd = ref('');

const activeTab = ref<'performance' | 'statistiques'>('performance');
const isLoading = ref(false);
const hasLoaded = ref(false);

const categoryStats = ref<CategoryStat[]>([]);
const serviceStats = ref<ServiceStat[]>([]);
const dailyData = ref<DailyStat[]>([]);
const paymentStats = ref<PaymentStat[]>([]);
const totalCA = ref(0);
const totalSales = ref(0);
const totalProducts = ref(0);
const totalServices = ref(0);
const productsCA = ref(0);
const servicesCA = ref(0);

const selectedVendor = computed(() =>
  vendors.value.find(v => v.id === selectedVendorId.value)
);

const avgBasket = computed(() =>
  totalSales.value > 0 ? totalCA.value / totalSales.value : 0
);

const topCategory = computed(() => {
  if (categoryStats.value.length === 0) return '—';
  const sorted = [...categoryStats.value].sort((a, b) => b.amount - a.amount);
  return sorted[0]?.name ?? '—';
});

const totalCategoryCount = computed(() =>
  categoryStats.value.reduce((s, c) => s + c.count, 0)
);
const totalCategoryAmount = computed(() =>
  categoryStats.value.reduce((s, c) => s + c.amount, 0)
);

const maxDailyTotal = computed(() =>
  Math.max(...dailyData.value.map(d => d.total), 1)
);

const maxPaymentAmount = computed(() =>
  Math.max(...paymentStats.value.map(p => p.amount), 1)
);

const availableYears = computed(() => {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => current - i);
});

const dateRange = computed(() => {
  if (customStart.value && customEnd.value) {
    return { start: customStart.value, end: customEnd.value };
  }
  if (selectedMonth.value !== null) {
    const y = selectedYear.value;
    const m = selectedMonth.value;
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }
  return { start: `${selectedYear.value}-01-01`, end: `${selectedYear.value}-12-31` };
});

const formatPrice = (n: number) => n.toFixed(2);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

const selectMonth = (index: number) => {
  selectedMonth.value = index;
  customStart.value = '';
  customEnd.value = '';
};

const clearMonth = () => {
  selectedMonth.value = null;
};

const onCustomDateChange = () => {
  if (customStart.value && customEnd.value) {
    selectedMonth.value = null;
  }
};

const loadVendors = async () => {
  if (!isSupabaseConfigured()) return;
  const { data } = await supabase
    .from('vendors')
    .select('*')
    .eq('is_active', true);
  if (data) {
    vendors.value = data.map((v: any) => ({
      id: v.id,
      first_name: v.first_name,
      last_name: v.last_name,
      initials: v.initials ?? '',
      color: v.color ?? '#6B7280',
    }));
  }

  const queryVendorId = route.query.vendorId as string | undefined;
  if (queryVendorId && vendors.value.some(v => v.id === queryVendorId)) {
    selectedVendorId.value = queryVendorId;
  }
};

const loadData = async () => {
  if (!isSupabaseConfigured() || !selectedVendorId.value) return;

  isLoading.value = true;
  hasLoaded.value = true;

  try {
    const { start, end } = dateRange.value;

    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select(`
        id,
        total,
        created_at,
        items:sale_items(id, product_name, quantity, subtotal_ttc, product_id),
        payments:payments(method, amount)
      `)
      .eq('vendor_id', selectedVendorId.value)
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59.999`)
      .eq('status', 'completed');

    if (salesError) {
      console.error('Erreur Supabase stats employé:', salesError);
      throw salesError;
    }

    const allSales = sales || [];

    const productIds = new Set<string>();
    for (const sale of allSales) {
      for (const item of (sale as any).items || []) {
        if (item.product_id) productIds.add(item.product_id);
      }
    }

    const productCategoryMap = new Map<string, { name: string; type: string; categoryName: string }>();
    if (productIds.size > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, type, category:categories(name)')
        .in('id', Array.from(productIds));
      if (products) {
        for (const p of products as any[]) {
          productCategoryMap.set(p.id, {
            name: p.name,
            type: p.type ?? 'product',
            categoryName: p.category?.name ?? 'Autre',
          });
        }
      }
    }

    totalCA.value = allSales.reduce((s: number, sale: any) => s + sale.total, 0);
    totalSales.value = allSales.length;

    const catMap = new Map<string, CategoryStat>();
    for (const cat of CATEGORY_ORDER) {
      catMap.set(cat, { name: cat, count: 0, amount: 0 });
    }

    const svcMap = new Map<string, ServiceStat>();
    let prodCount = 0;
    let svcCount = 0;
    let prodAmount = 0;
    let svcAmount = 0;

    for (const sale of allSales) {
      for (const item of (sale as any).items || []) {
        const productInfo = item.product_id ? productCategoryMap.get(item.product_id) : null;
        const catName = productInfo?.categoryName ?? 'Autre';
        const type = productInfo?.type ?? 'product';

        if (!catMap.has(catName)) {
          catMap.set(catName, { name: catName, count: 0, amount: 0 });
        }
        const stat = catMap.get(catName)!;
        stat.count += item.quantity;
        stat.amount += item.subtotal_ttc;

        if (type === 'service') {
          svcCount += item.quantity;
          svcAmount += item.subtotal_ttc;
          const svcName = item.product_name || productInfo?.name || 'Service';
          if (!svcMap.has(svcName)) {
            svcMap.set(svcName, { name: svcName, count: 0, amount: 0 });
          }
          const svc = svcMap.get(svcName)!;
          svc.count += item.quantity;
          svc.amount += item.subtotal_ttc;
        } else {
          prodCount += item.quantity;
          prodAmount += item.subtotal_ttc;
        }
      }
    }

    const orderedCats: CategoryStat[] = [];
    for (const name of CATEGORY_ORDER) {
      const stat = catMap.get(name);
      if (stat && stat.amount > 0) orderedCats.push(stat);
    }
    for (const [name, stat] of catMap) {
      if (!CATEGORY_ORDER.includes(name) && stat.amount > 0) orderedCats.push(stat);
    }
    categoryStats.value = orderedCats;
    serviceStats.value = Array.from(svcMap.values()).sort((a, b) => b.amount - a.amount);
    totalProducts.value = prodCount;
    totalServices.value = svcCount;
    productsCA.value = prodAmount;
    servicesCA.value = svcAmount;

    const payMap = new Map<string, PaymentStat>();
    for (const sale of allSales) {
      for (const payment of (sale as any).payments || []) {
        const method = payment.method;
        if (!payMap.has(method)) {
          payMap.set(method, {
            method,
            label: PAYMENT_LABELS[method] || method,
            amount: 0,
            count: 0,
          });
        }
        const p = payMap.get(method)!;
        p.amount += payment.amount;
        p.count += 1;
      }
    }
    paymentStats.value = Array.from(payMap.values()).sort((a, b) => b.amount - a.amount);

    const dayMap = new Map<string, DailyStat>();
    for (const sale of allSales) {
      const day = (sale as any).created_at.split('T')[0];
      if (!dayMap.has(day)) {
        dayMap.set(day, { date: day, total: 0, count: 0 });
      }
      const d = dayMap.get(day)!;
      d.total += (sale as any).total;
      d.count += 1;
    }
    dailyData.value = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error('Erreur chargement stats employé:', err);
  } finally {
    isLoading.value = false;
  }
};

watch(selectedVendorId, (id) => {
  if (id) {
    router.replace({ query: { ...route.query, vendorId: id } });
  }
});

onMounted(loadVendors);
</script>

<template>
  <main class="flex-1 p-4 lg:p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto space-y-6">

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Statistiques Employé</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Performance individuelle par période</p>
        </div>
      </div>

      <!-- Vendor selector -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
        <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sélectionner un employé</label>

        <div v-if="vendors.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
          Chargement des employés...
        </div>

        <div v-else class="relative">
          <button
            type="button"
            @click="vendorDropdownOpen = !vendorDropdownOpen"
            class="w-full sm:w-96 flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-left hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors"
          >
            <template v-if="selectedVendor">
              <div
                :style="{ backgroundColor: selectedVendor.color }"
                class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              >
                {{ selectedVendor.initials }}
              </div>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ selectedVendor.first_name }} {{ selectedVendor.last_name }}
              </span>
            </template>
            <template v-else>
              <Users class="w-5 h-5 text-gray-400" />
              <span class="text-sm text-gray-500 dark:text-gray-400">Choisir un employé...</span>
            </template>
            <ChevronDown class="w-4 h-4 ml-auto text-gray-400" />
          </button>

          <div
            v-if="vendorDropdownOpen"
            class="absolute z-20 mt-2 w-full sm:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden"
          >
            <button
              v-for="vendor in vendors"
              :key="vendor.id"
              type="button"
              @click="selectedVendorId = vendor.id; vendorDropdownOpen = false"
              :class="[
                'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                selectedVendorId === vendor.id && 'bg-emerald-50 dark:bg-emerald-900/20'
              ]"
            >
              <div
                :style="{ backgroundColor: vendor.color }"
                class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              >
                {{ vendor.initials }}
              </div>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ vendor.first_name }} {{ vendor.last_name }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Period selector -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">Année :</label>
          <select
            v-model="selectedYear"
            class="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
          >
            <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <div>
          <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Mois :</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(label, i) in MONTH_LABELS"
              :key="i"
              type="button"
              @click="selectedMonth === i ? clearMonth() : selectMonth(i)"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                selectedMonth === i
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              ]"
            >
              {{ label.substring(0, 3) }}
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-end gap-3">
          <div>
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Du</label>
            <input
              v-model="customStart"
              @change="onCustomDateChange"
              type="date"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Au</label>
            <input
              v-model="customEnd"
              @change="onCustomDateChange"
              type="date"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
            />
          </div>
          <button
            @click="loadData"
            :disabled="isLoading || !selectedVendorId"
            class="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calculator class="w-4 h-4" />
            <span>Calculer</span>
          </button>
        </div>

        <p v-if="!selectedVendorId" class="text-xs text-amber-600 dark:text-amber-400">
          Veuillez sélectionner un employé avant de calculer.
        </p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <RefreshCw class="w-8 h-8 text-gray-400 animate-spin" />
      </div>

      <!-- No data yet -->
      <div v-else-if="!hasLoaded" class="text-center py-16 text-gray-500 dark:text-gray-400">
        <Users class="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p class="text-sm">Sélectionnez un employé et une période puis cliquez sur Calculer</p>
      </div>

      <template v-else>
        <!-- Tabs -->
        <div class="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          <button
            @click="activeTab = 'performance'"
            :class="[
              'px-5 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'performance'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            Performance
          </button>
          <button
            @click="activeTab = 'statistiques'"
            :class="[
              'px-5 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'statistiques'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            Statistiques
          </button>
        </div>

        <!-- PERFORMANCE TAB -->
        <template v-if="activeTab === 'performance'">
          <!-- Totaux table -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div class="px-5 py-3 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                Totaux — {{ selectedVendor?.first_name }} {{ selectedVendor?.last_name }}
              </h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-600">
                    <th class="px-4 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300">Catégorie</th>
                    <th class="px-4 py-2.5 text-right font-semibold text-gray-700 dark:text-gray-300">Nb</th>
                    <th class="px-4 py-2.5 text-right font-semibold text-gray-700 dark:text-gray-300">Montant</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                  <tr
                    v-for="cat in categoryStats"
                    :key="cat.name"
                    :class="[
                      'text-gray-900 dark:text-gray-100',
                      cat.count === 0 && 'opacity-40'
                    ]"
                  >
                    <td class="px-4 py-2">{{ cat.name }}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{{ cat.count }}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{{ formatPrice(cat.amount) }} €</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="font-bold bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-300 dark:border-gray-600">
                    <td class="px-4 py-2.5">Total</td>
                    <td class="px-4 py-2.5 text-right tabular-nums">{{ totalCategoryCount }}</td>
                    <td class="px-4 py-2.5 text-right tabular-nums">{{ formatPrice(totalCategoryAmount) }} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Prestations sub-table -->
          <div v-if="serviceStats.length > 0" class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div class="px-5 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-gray-200 dark:border-gray-600">
              <h2 class="text-sm font-semibold text-purple-800 dark:text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <Scissors class="w-4 h-4" />
                Prestations (Services)
              </h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-600">
                    <th class="px-4 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300">Service</th>
                    <th class="px-4 py-2.5 text-right font-semibold text-gray-700 dark:text-gray-300">Nb</th>
                    <th class="px-4 py-2.5 text-right font-semibold text-gray-700 dark:text-gray-300">Montant</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                  <tr v-for="svc in serviceStats" :key="svc.name" class="text-gray-900 dark:text-gray-100">
                    <td class="px-4 py-2">{{ svc.name }}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{{ svc.count }}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{{ formatPrice(svc.amount) }} €</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="font-bold bg-purple-50/50 dark:bg-purple-900/10 border-t-2 border-gray-300 dark:border-gray-600">
                    <td class="px-4 py-2.5">Total Prestations</td>
                    <td class="px-4 py-2.5 text-right tabular-nums">{{ totalServices }}</td>
                    <td class="px-4 py-2.5 text-right tabular-nums">{{ formatPrice(servicesCA) }} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </template>

        <!-- STATISTIQUES TAB -->
        <template v-if="activeTab === 'statistiques'">
          <!-- KPI Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <Euro class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatPrice(totalCA) }} €</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Total CA</p>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <ShoppingBag class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalSales }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Nombre de ventes</p>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <BarChart3 class="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatPrice(avgBasket) }} €</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Panier moyen</p>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <Award class="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white truncate">{{ topCategory }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Top catégorie</p>
            </div>
          </div>

          <!-- Daily CA chart + Payment methods -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Daily CA bar chart -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                CA journalier
              </h3>

              <div v-if="dailyData.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                Aucune donnée
              </div>

              <div v-else class="space-y-2 max-h-80 overflow-y-auto">
                <div
                  v-for="day in dailyData"
                  :key="day.date"
                  class="flex items-center gap-3"
                >
                  <span class="w-14 text-xs text-gray-500 dark:text-gray-400 shrink-0">{{ formatDate(day.date) }}</span>
                  <div class="flex-1 h-7 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative">
                    <div
                      class="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 dark:from-emerald-600 dark:to-emerald-500 rounded-lg transition-all duration-500"
                      :style="{ width: `${(day.total / maxDailyTotal) * 100}%` }"
                    ></div>
                    <span
                      v-if="day.total > 0"
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-700 dark:text-gray-200"
                    >
                      {{ formatPrice(day.total) }} €
                    </span>
                  </div>
                  <span class="w-10 text-xs text-gray-400 dark:text-gray-500 text-right shrink-0">{{ day.count }}v.</span>
                </div>
              </div>
            </div>

            <!-- Payment methods -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <CreditCard class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                Modes de paiement
              </h3>

              <div v-if="paymentStats.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                Aucune donnée
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="pay in paymentStats"
                  :key="pay.method"
                  class="flex items-center gap-3"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ pay.label }}</span>
                      <span class="text-sm font-bold text-gray-900 dark:text-white ml-2 shrink-0">{{ formatPrice(pay.amount) }} €</span>
                    </div>
                    <div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-gradient-to-r from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500 rounded-full"
                        :style="{ width: `${(pay.amount / maxPaymentAmount) * 100}%` }"
                      ></div>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ pay.count }} paiement(s)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Products vs Services split -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Produits vs Services
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Package class="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">Produits</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ totalProducts }} article(s)</p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-gray-900 dark:text-white">{{ formatPrice(productsCA) }} €</p>
                  <p v-if="totalCA > 0" class="text-xs text-gray-500 dark:text-gray-400">
                    {{ ((productsCA / totalCA) * 100).toFixed(0) }}%
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <div class="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <Scissors class="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">Services</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ totalServices }} prestation(s)</p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-gray-900 dark:text-white">{{ formatPrice(servicesCA) }} €</p>
                  <p v-if="totalCA > 0" class="text-xs text-gray-500 dark:text-gray-400">
                    {{ ((servicesCA / totalCA) * 100).toFixed(0) }}%
                  </p>
                </div>
              </div>
            </div>

            <!-- Visual split bar -->
            <div v-if="totalCA > 0" class="mt-4 h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
              <div
                class="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                :style="{ width: `${(productsCA / totalCA) * 100}%` }"
              ></div>
              <div
                class="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                :style="{ width: `${(servicesCA / totalCA) * 100}%` }"
              ></div>
            </div>
          </div>
        </template>
      </template>
    </div>
  </main>
</template>
