<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  TrendingUp,
  TrendingDown,
  Euro,
  ShoppingBag,
  Users,
  BarChart3,
  RefreshCw,
  Award,
  Clock,
  ExternalLink,
} from 'lucide-vue-next';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const router = useRouter();

// Types
interface DailyStat {
  date: string;
  total: number;
  count: number;
}

interface TopService {
  name: string;
  count: number;
  revenue: number;
}

interface VendorStat {
  id: string;
  name: string;
  initials: string;
  color: string;
  total: number;
  count: number;
}

interface SaleJournal {
  id: string;
  ticket_number: string;
  total: number;
  created_at: string;
  client_name: string | null;
  vendor_name: string;
  items_count: number;
}

// State
const isLoading = ref(true);

// Stats
const todayStats = ref({ total: 0, count: 0, avgTicket: 0 });
const weekStats = ref({ total: 0, count: 0, avgTicket: 0 });
const monthStats = ref({ total: 0, count: 0, avgTicket: 0 });
const yesterdayTotal = ref(0);
const lastWeekTotal = ref(0);

// Données détaillées
const dailyData = ref<DailyStat[]>([]);
const topServices = ref<TopService[]>([]);
const vendorStats = ref<VendorStat[]>([]);
const todayJournal = ref<SaleJournal[]>([]);

// Calculs
const todayGrowth = computed(() => {
  if (yesterdayTotal.value === 0) return 0;
  return ((todayStats.value.total - yesterdayTotal.value) / yesterdayTotal.value) * 100;
});

const weekGrowth = computed(() => {
  if (lastWeekTotal.value === 0) return 0;
  return ((weekStats.value.total - lastWeekTotal.value) / lastWeekTotal.value) * 100;
});

const maxDailyTotal = computed(() => 
  Math.max(...dailyData.value.map(d => d.total), 1)
);

const maxServiceCount = computed(() => 
  Math.max(...topServices.value.map(s => s.count), 1)
);

// Chargement des données
const loadStats = async () => {
  if (!isSupabaseConfigured()) {
    isLoading.value = false;
    return;
  }

  isLoading.value = true;

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Stats du jour
    const { data: todaySales } = await supabase
      .from('sales')
      .select('total')
      .gte('created_at', `${today}T00:00:00`)
      .eq('status', 'completed');

    const todayTotals = todaySales || [];
    todayStats.value = {
      total: todayTotals.reduce((sum, s) => sum + s.total, 0),
      count: todayTotals.length,
      avgTicket: todayTotals.length > 0 
        ? todayTotals.reduce((sum, s) => sum + s.total, 0) / todayTotals.length 
        : 0,
    };

    // Stats d'hier (pour comparaison)
    const { data: yesterdaySales } = await supabase
      .from('sales')
      .select('total')
      .gte('created_at', `${yesterday}T00:00:00`)
      .lt('created_at', `${today}T00:00:00`)
      .eq('status', 'completed');

    yesterdayTotal.value = (yesterdaySales || []).reduce((sum, s) => sum + s.total, 0);

    // Stats de la semaine
    const { data: weekSales } = await supabase
      .from('sales')
      .select('total')
      .gte('created_at', `${weekAgo}T00:00:00`)
      .eq('status', 'completed');

    const weekTotals = weekSales || [];
    weekStats.value = {
      total: weekTotals.reduce((sum, s) => sum + s.total, 0),
      count: weekTotals.length,
      avgTicket: weekTotals.length > 0 
        ? weekTotals.reduce((sum, s) => sum + s.total, 0) / weekTotals.length 
        : 0,
    };

    // Stats semaine précédente (pour comparaison)
    const { data: lastWeekSales } = await supabase
      .from('sales')
      .select('total')
      .gte('created_at', `${twoWeeksAgo}T00:00:00`)
      .lt('created_at', `${weekAgo}T00:00:00`)
      .eq('status', 'completed');

    lastWeekTotal.value = (lastWeekSales || []).reduce((sum, s) => sum + s.total, 0);

    // Stats du mois
    const { data: monthSales } = await supabase
      .from('sales')
      .select('total')
      .gte('created_at', `${monthAgo}T00:00:00`)
      .eq('status', 'completed');

    const monthTotals = monthSales || [];
    monthStats.value = {
      total: monthTotals.reduce((sum, s) => sum + s.total, 0),
      count: monthTotals.length,
      avgTicket: monthTotals.length > 0 
        ? monthTotals.reduce((sum, s) => sum + s.total, 0) / monthTotals.length 
        : 0,
    };

    // Données quotidiennes (7 derniers jours)
    await loadDailyData();

    // Top services
    await loadTopServices();

    // Stats par vendeur
    await loadVendorStats();

    // Journal du jour
    await loadTodayJournal();

  } catch (err) {
    console.error('Erreur chargement stats:', err);
  } finally {
    isLoading.value = false;
  }
};

const loadDailyData = async () => {
  const days: DailyStat[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0] as string;
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] as string;

    const { data } = await supabase
      .from('sales')
      .select('total')
      .gte('created_at', `${dateStr}T00:00:00`)
      .lt('created_at', `${nextDate}T00:00:00`)
      .eq('status', 'completed');

    const sales = data || [];
    days.push({
      date: dateStr,
      total: sales.reduce((sum, s) => sum + s.total, 0),
      count: sales.length,
    });
  }

  dailyData.value = days;
};

const loadTopServices = async () => {
  const { data } = await supabase
    .from('sale_items')
    .select('product_name, quantity, subtotal_ttc');

  if (!data) {
    topServices.value = [];
    return;
  }

  // Grouper par service
  const serviceMap = new Map<string, TopService>();
  for (const item of data) {
    const existing = serviceMap.get(item.product_name);
    if (existing) {
      existing.count += item.quantity;
      existing.revenue += item.subtotal_ttc;
    } else {
      serviceMap.set(item.product_name, {
        name: item.product_name,
        count: item.quantity,
        revenue: item.subtotal_ttc,
      });
    }
  }

  // Trier par count et prendre les 5 premiers
  topServices.value = Array.from(serviceMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

const loadVendorStats = async () => {
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, first_name, last_name, initials, color')
    .eq('is_active', true);

  if (!vendors) {
    vendorStats.value = [];
    return;
  }

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Récupérer les ventes complétées sur la période avec leurs items (vendor_id par article)
  const { data: sales } = await supabase
    .from('sales')
    .select(`
      id,
      items:sale_items(subtotal_ttc, vendor_id)
    `)
    .gte('created_at', `${monthAgo}T00:00:00`)
    .eq('status', 'completed');

  // Agrégation par vendeur (sale_items.vendor_id)
  const byVendor = new Map<string, { total: number; saleIds: Set<string> }>();
  for (const sale of sales || []) {
    const items = (sale as { items?: { subtotal_ttc: number; vendor_id: string | null }[] }).items || [];
    for (const item of items) {
      const vid = item.vendor_id;
      if (!vid) continue;
      if (!byVendor.has(vid)) byVendor.set(vid, { total: 0, saleIds: new Set() });
      const entry = byVendor.get(vid)!;
      entry.total += item.subtotal_ttc ?? 0;
      entry.saleIds.add((sale as { id: string }).id);
    }
  }

  const stats: VendorStat[] = vendors.map((v) => ({
    id: v.id,
    name: `${v.first_name} ${v.last_name}`,
    initials: v.initials ?? '',
    color: v.color ?? '#6B7280',
    total: byVendor.get(v.id)?.total ?? 0,
    count: byVendor.get(v.id)?.saleIds.size ?? 0,
  }));

  vendorStats.value = stats.sort((a, b) => b.total - a.total);
};

const getSaleVendorSummary = (sale: { items?: { vendor?: { first_name: string; last_name: string } }[]; vendor?: { first_name: string; last_name: string } }) => {
  const items = sale.items || [];
  const names = new Set<string>();
  for (const item of items) {
    const v = item.vendor;
    if (v) names.add(`${v.first_name} ${v.last_name}`.trim());
  }
  if (names.size > 0) return [...names].join(', ');
  return sale.vendor ? `${sale.vendor.first_name} ${sale.vendor.last_name}`.trim() : '—';
};

const loadTodayJournal = async () => {
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('sales')
    .select(`
      id,
      ticket_number,
      total,
      created_at,
      client:clients(first_name, last_name),
      vendor:vendors(first_name, last_name),
      items:sale_items(id, vendor:vendors(first_name, last_name))
    `)
    .gte('created_at', `${today}T00:00:00`)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (!data) {
    todayJournal.value = [];
    return;
  }

  todayJournal.value = data.map((sale: any) => ({
    id: sale.id,
    ticket_number: sale.ticket_number,
    total: sale.total,
    created_at: sale.created_at,
    client_name: sale.client ? `${sale.client.first_name} ${sale.client.last_name}` : null,
    vendor_name: getSaleVendorSummary(sale),
    items_count: sale.items?.length || 0,
  }));
};

// Formatage
const formatPrice = (amount: number) => amount.toFixed(2);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatFullDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Lifecycle
onMounted(loadStats);
</script>

<template>
  <main class="flex-1 p-4 lg:p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- En-tête -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Statistiques</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Vue d'ensemble de l'activité</p>
        </div>
        
        <button
          @click="loadStats"
          :disabled="isLoading"
          class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw :class="['w-4 h-4', isLoading && 'animate-spin']" />
          <span>Actualiser</span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <RefreshCw class="w-8 h-8 text-gray-400 animate-spin" />
      </div>

      <template v-else>
        <!-- Cards KPI principales -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- CA Aujourd'hui -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Euro class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div 
                v-if="todayGrowth !== 0"
                :class="[
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  todayGrowth > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                ]"
              >
                <component :is="todayGrowth > 0 ? TrendingUp : TrendingDown" class="w-3 h-3" />
                {{ Math.abs(todayGrowth).toFixed(0) }}%
              </div>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatPrice(todayStats.total) }}€</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">CA aujourd'hui</p>
          </div>

          <!-- CA Semaine -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-3">
              <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <BarChart3 class="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div 
                v-if="weekGrowth !== 0"
                :class="[
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  weekGrowth > 0 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                ]"
              >
                <component :is="weekGrowth > 0 ? TrendingUp : TrendingDown" class="w-3 h-3" />
                {{ Math.abs(weekGrowth).toFixed(0) }}%
              </div>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatPrice(weekStats.total) }}€</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">CA cette semaine</p>
          </div>

          <!-- Nombre de ventes -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-3">
              <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <ShoppingBag class="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ todayStats.count }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Ventes aujourd'hui</p>
          </div>

          <!-- Panier moyen -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-3">
              <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Users class="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatPrice(todayStats.avgTicket) }}€</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Panier moyen</p>
          </div>
        </div>

        <!-- Graphique CA 7 jours + Top Services -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Graphique CA -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Chiffre d'affaires (7 derniers jours)
            </h3>
            
            <div class="space-y-3">
              <div
                v-for="day in dailyData"
                :key="day.date"
                class="flex items-center gap-3"
              >
                <span class="w-16 text-xs text-gray-500 dark:text-gray-400 shrink-0">{{ formatDate(day.date) }}</span>
                <div class="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative">
                  <div 
                    class="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 dark:from-emerald-600 dark:to-emerald-500 rounded-lg transition-all duration-500"
                    :style="{ width: `${(day.total / maxDailyTotal) * 100}%` }"
                  ></div>
                  <span 
                    v-if="day.total > 0"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-700 dark:text-gray-200"
                  >
                    {{ formatPrice(day.total) }}€
                  </span>
                </div>
                <span class="w-12 text-xs text-gray-400 dark:text-gray-500 text-right shrink-0">{{ day.count }} v.</span>
              </div>
            </div>
          </div>

          <!-- Top Services -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award class="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Top 5 Services
            </h3>
            
            <div v-if="topServices.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
              Aucune donnée
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(service, index) in topServices"
                :key="service.name"
                class="flex items-center gap-3"
              >
                <span 
                  :class="[
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    index === 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  ]"
                >
                  {{ index + 1 }}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ service.name }}</p>
                  <div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-purple-500 to-purple-400 dark:from-purple-600 dark:to-purple-500 rounded-full"
                      :style="{ width: `${(service.count / maxServiceCount) * 100}%` }"
                    ></div>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-sm font-bold text-gray-900 dark:text-white">{{ service.count }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatPrice(service.revenue) }}€</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats par vendeur -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
            Performance vendeurs (30 derniers jours)
          </h3>
          
          <div v-if="vendorStats.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
            Aucune donnée
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              v-for="vendor in vendorStats"
              :key="vendor.id"
              @click="router.push({ name: 'stats-employe', query: { vendorId: vendor.id } })"
              class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left group cursor-pointer"
            >
              <div 
                :style="{ backgroundColor: vendor.color }"
                class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
              >
                {{ vendor.initials }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1">
                  {{ vendor.name }}
                  <ExternalLink class="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ vendor.count }} ventes</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-lg font-bold text-gray-900 dark:text-white">{{ formatPrice(vendor.total) }}€</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Journal des ventes du jour -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Clock class="w-4 h-4 dark:text-gray-400" />
              Journal des ventes — {{ formatFullDate(new Date().toISOString()) }}
            </h3>
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ todayJournal.length }} ventes</span>
          </div>

          <div v-if="todayJournal.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
            Aucune vente aujourd'hui
          </div>

          <div v-else class="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
            <div
              v-for="sale in todayJournal"
              :key="sale.id"
              class="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div class="w-14 text-center shrink-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatTime(sale.created_at) }}</p>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ sale.client_name || 'Client anonyme' }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ sale.ticket_number }} · {{ sale.items_count }} article(s) · {{ sale.vendor_name }}
                </p>
              </div>
              <p class="text-lg font-bold text-gray-900 dark:text-white shrink-0">{{ formatPrice(sale.total) }}€</p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </main>
</template>
