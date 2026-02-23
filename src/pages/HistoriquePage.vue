<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { 
  Search, 
  Euro,
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Receipt,
  CreditCard,
  Banknote,
  RefreshCw,
  Smartphone,
  FileText,
  Gift,
  HandCoins,
  Wrench,
  Edit,
  X
} from 'lucide-vue-next';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Sale, PaymentMethod, SaleStatus } from '../types/database';

// Types (vendor/client partiels depuis l'API)
interface SaleWithDetails extends Omit<Sale, 'vendor' | 'client'> {
  items?: {
    id: string;
    product_name: string;
    quantity: number;
    price_ht: number;
    subtotal_ttc: number;
  }[];
  payments?: {
    method: PaymentMethod;
    amount: number;
  }[];
  vendor?: { first_name: string; last_name: string };
  client?: { first_name: string; last_name: string };
}

// State
const sales = ref<SaleWithDetails[]>([]);
const totalSalesCount = ref<number | null>(null);
const globalTotalAmount = ref<number | null>(null);
const globalAvgTicket = ref<number | null>(null);
const isLoading = ref(true);
const searchQuery = ref('');
const dateFilter = ref('today'); // today, week, month, custom, all
const dateFrom = ref<string>(''); // Pour période personnalisée
const dateTo = ref<string>(''); // Pour période personnalisée
const statusFilter = ref<SaleStatus | 'all'>('all');
const pageSize = ref(50); // 25, 50, 100
const currentPage = ref(1);
const expandedSaleId = ref<string | null>(null);
const saleToEditPayment = ref<SaleWithDetails | null>(null);
const editPaymentMethod = ref<PaymentMethod>('card');
const isSavingPayment = ref(false);

// Moyens de paiement (aligné avec la caisse)
const paymentMethodsList: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: 'cash', label: 'Espèces', icon: Banknote },
  { id: 'card', label: 'CB', icon: CreditCard },
  { id: 'contactless', label: 'Sans contact', icon: Smartphone },
  { id: 'amex', label: 'American Express', icon: CreditCard },
  { id: 'check', label: 'Chèque', icon: FileText },
  { id: 'gift_card', label: 'Chèque Cadeau', icon: Gift },
  { id: 'free', label: 'Gratuit', icon: HandCoins },
  { id: 'technical', label: 'Utilisation technique', icon: Wrench },
];

// Filtres de date
const dateFilters = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'week', label: 'Cette semaine' },
  { id: 'month', label: 'Ce mois' },
  { id: 'custom', label: 'Période' },
  { id: 'all', label: 'Tout' },
];

// Filtres de statut
const statusFilters: { id: SaleStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'completed', label: 'Complétées' },
  { id: 'cancelled', label: 'Annulées' },
  { id: 'refunded', label: 'Remboursées' },
  { id: 'pending', label: 'En attente' },
];

// Options de pagination
const pageSizeOptions = [25, 50, 100];

// Computed
const totalPages = computed(() => {
  const total = totalSalesCount.value ?? 0;
  const size = pageSize.value;
  return Math.max(1, Math.ceil(total / size));
});

const paginationInfo = computed(() => {
  const total = totalSalesCount.value ?? 0;
  const size = pageSize.value;
  const page = currentPage.value;
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  return { from, to, total };
});

// Numéros de page à afficher (fenêtre glissante)
const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const delta = 2; // pages avant/après la courante
  const pages: number[] = [];
  for (let p = Math.max(1, current - delta); p <= Math.min(total, current + delta); p++) {
    pages.push(p);
  }
  return pages;
});

// Calculer les bornes de date selon le filtre
function getDateBounds(): { startDate: string | null; endDate: string | null } {
  const now = new Date();
  const today = now.toISOString().split('T')[0] ?? null;
  if (!today) return { startDate: null, endDate: null };

  if (dateFilter.value === 'today') {
    return { startDate: today, endDate: today };
  }
  if (dateFilter.value === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start = weekAgo.toISOString().split('T')[0] ?? today;
    return { startDate: start, endDate: today };
  }
  if (dateFilter.value === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const start = monthAgo.toISOString().split('T')[0] ?? today;
    return { startDate: start, endDate: today };
  }
  if (dateFilter.value === 'custom' && dateFrom.value && dateTo.value) {
    return { startDate: dateFrom.value, endDate: dateTo.value };
  }
  return { startDate: null, endDate: null };
}

// Charger les ventes
const loadSales = async () => {
  isLoading.value = true;
  
  if (!isSupabaseConfigured()) {
    sales.value = [];
    isLoading.value = false;
    return;
  }

  try {
    const { startDate, endDate } = getDateBounds();
    const size = pageSize.value;
    const page = currentPage.value;
    const from = (page - 1) * size;
    const to = from + size - 1;

    // Requête du nombre total (filtres date + statut)
    let countQuery = supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });
    if (startDate) countQuery = countQuery.gte('created_at', startDate);
    if (endDate) countQuery = countQuery.lte('created_at', endDate + 'T23:59:59.999Z');
    if (statusFilter.value !== 'all') countQuery = countQuery.eq('status', statusFilter.value);
    const { count } = await countQuery;
    totalSalesCount.value = count ?? null;

    // Stats globales (RPC get_sales_stats)
    globalTotalAmount.value = null;
    globalAvgTicket.value = null;
    try {
      const { data: statsData } = await (supabase as any).rpc('get_sales_stats', {
        p_start_date: startDate != null ? startDate : null,
        p_end_date: endDate != null ? endDate + 'T23:59:59.999Z' : null,
      });
      if (statsData && Array.isArray(statsData) && statsData[0]) {
        const row = statsData[0] as { total_count: number; total_amount: number; avg_ticket: number };
        globalTotalAmount.value = Number(row.total_amount);
        globalAvgTicket.value = Number(row.avg_ticket);
      }
    } catch {
      // Fonction absente ou ancienne version
    }

    // Requête des ventes (liste paginée)
    let query = supabase
      .from('sales')
      .select(`
        *,
        vendor:vendors(first_name, last_name),
        client:clients(first_name, last_name),
        items:sale_items(id, product_name, quantity, price_ht, subtotal_ttc),
        payments(method, amount)
      `)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate + 'T23:59:59.999Z');
    if (statusFilter.value !== 'all') query = query.eq('status', statusFilter.value);

    const { data, error } = await query;

    if (error) throw error;
    sales.value = (data || []) as SaleWithDetails[];
  } catch (err) {
    console.error('Erreur chargement historique:', err);
    sales.value = [];
  } finally {
    isLoading.value = false;
  }
};

// Réinitialiser à la page 1 quand les filtres changent
const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value));
  loadSales();
};

const pageInputValue = ref('');
const syncPageInput = () => {
  pageInputValue.value = String(currentPage.value);
};
const onPageInputSubmit = () => {
  const num = parseInt(pageInputValue.value, 10);
  if (!isNaN(num) && num >= 1) {
    goToPage(num);
  } else {
    syncPageInput();
  }
};

const applyFilters = () => {
  currentPage.value = 1;
  loadSales();
};

// Filtrer par recherche
const filteredSales = computed(() => {
  if (!searchQuery.value.trim()) return sales.value;
  
  const q = searchQuery.value.toLowerCase();
  return sales.value.filter(sale => 
    sale.ticket_number.toLowerCase().includes(q) ||
    sale.client?.first_name?.toLowerCase().includes(q) ||
    sale.client?.last_name?.toLowerCase().includes(q) ||
    sale.vendor?.first_name?.toLowerCase().includes(q) ||
    sale.vendor?.last_name?.toLowerCase().includes(q)
  );
});

// Statistiques
const stats = computed(() => {
  const total = filteredSales.value.reduce((sum, s) => sum + s.total, 0);
  const count = filteredSales.value.length;
  const avgTicket = count > 0 ? total / count : 0;
  
  return { total, count, avgTicket };
});

// Toggle détails vente
const toggleSaleDetails = (saleId: string) => {
  expandedSaleId.value = expandedSaleId.value === saleId ? null : saleId;
};

// Formater la date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Icône méthode de paiement
const paymentIcon = (method: PaymentMethod) => {
  switch (method) {
    case 'cash': return Banknote;
    case 'card':
    case 'contactless':
    case 'amex': return CreditCard;
    case 'free': return HandCoins;
    case 'technical': return Wrench;
    case 'gift_card': return Gift;
    default: return Euro;
  }
};

const paymentLabel = (method: PaymentMethod) => {
  const labels: Record<PaymentMethod, string> = {
    cash: 'Espèces',
    card: 'Carte',
    contactless: 'Sans contact',
    amex: 'American Express',
    check: 'Chèque',
    gift_card: 'Chèque Cadeau',
    free: 'Gratuit',
    technical: 'Utilisation technique',
  };
  return labels[method] || method;
};

// Modifier le mode de paiement d'une vente
const openEditPayment = (sale: SaleWithDetails) => {
  saleToEditPayment.value = sale;
  const current = sale.payments?.[0];
  editPaymentMethod.value = current?.method ?? 'card';
};

const closeEditPayment = () => {
  saleToEditPayment.value = null;
};

const saveEditPayment = async () => {
  const sale = saleToEditPayment.value;
  if (!sale || !isSupabaseConfigured()) return;

  isSavingPayment.value = true;
  try {
    await supabase.from('payments').delete().eq('sale_id', sale.id);
    const { error } = await supabase.from('payments').insert({
      sale_id: sale.id,
      method: editPaymentMethod.value,
      amount: sale.total,
    } as any);

    if (error) throw error;

    sale.payments = [{ method: editPaymentMethod.value, amount: sale.total }];
    closeEditPayment();
  } catch (err) {
    console.error('Erreur modification paiement:', err);
    alert('Impossible de modifier le paiement.');
  } finally {
    isSavingPayment.value = false;
  }
};

// Lifecycle
onMounted(loadSales);

// Recharger quand page ou pageSize change
watch([currentPage, pageSize], () => loadSales());
watch(currentPage, () => syncPageInput(), { immediate: true });

// Recharger quand les filtres changent (reset page 1)
watch([dateFilter, statusFilter], () => {
  currentPage.value = 1;
  if (dateFilter.value !== 'custom') loadSales();
});
</script>

<template>
  <main class="flex-1 p-4 lg:p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
    <div class="max-w-6xl mx-auto space-y-6">
      
      <!-- En-tête -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Historique des ventes</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Consultez toutes les transactions</p>
        </div>
        
        <button
          @click="loadSales"
          :disabled="isLoading"
          class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw :class="['w-4 h-4', isLoading && 'animate-spin']" />
          <span>Actualiser</span>
        </button>
      </div>

      <!-- Statistiques -->
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Total</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ (globalTotalAmount ?? stats.total).toFixed(2) }}€</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Ventes</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ totalSalesCount ?? stats.count }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Panier moyen</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ (globalAvgTicket ?? stats.avgTicket).toFixed(2) }}€</p>
        </div>
      </div>
      <p v-if="totalSalesCount != null && totalSalesCount > 0" class="text-sm text-gray-500 dark:text-gray-400">
        {{ paginationInfo.from }}-{{ paginationInfo.to }} sur {{ paginationInfo.total }} ventes
      </p>

      <!-- Filtres -->
      <div class="space-y-4">
        <div class="flex flex-col lg:flex-row gap-4">
          <!-- Recherche -->
          <div class="relative flex-1">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher par ticket, client, vendeur..."
              class="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl text-sm focus:outline-none focus:border-gray-900 dark:focus:border-emerald-500 focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-emerald-500/30"
            />
          </div>

          <!-- Filtre date -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="filter in dateFilters"
              :key="filter.id"
              @click="dateFilter = filter.id; if (filter.id !== 'custom') loadSales()"
              :class="[
                'px-4 py-2 text-sm font-medium rounded-xl transition-colors',
                dateFilter === filter.id
                  ? 'bg-gray-900 dark:bg-emerald-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              ]"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <!-- Période personnalisée -->
        <div v-if="dateFilter === 'custom'" class="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Du</label>
            <input
              v-model="dateFrom"
              type="date"
              class="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-gray-100"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Au</label>
            <input
              v-model="dateTo"
              type="date"
              class="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-gray-100"
            />
          </div>
          <button
            @click="applyFilters"
            class="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-emerald-600 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-emerald-500 transition-colors"
          >
            Appliquer
          </button>
        </div>

        <!-- Filtre statut + taille page -->
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex gap-2">
            <button
              v-for="sf in statusFilters"
              :key="sf.id"
              @click="statusFilter = sf.id; applyFilters()"
              :class="[
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                statusFilter === sf.id
                  ? 'bg-gray-900 dark:bg-emerald-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              ]"
            >
              {{ sf.label }}
            </button>
          </div>
          <div class="flex items-center gap-2 ml-auto">
            <span class="text-sm text-gray-500 dark:text-gray-400">Par page</span>
            <select
              v-model.number="pageSize"
              class="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-gray-100"
            >
              <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Liste des ventes -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <!-- Loading -->
        <div v-if="isLoading" class="p-8 text-center">
          <RefreshCw class="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin mx-auto" />
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Chargement...</p>
        </div>

        <!-- Vide -->
        <div v-else-if="filteredSales.length === 0" class="p-8 text-center">
          <Receipt class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <p class="text-gray-500 dark:text-gray-400 mt-2">Aucune vente trouvée</p>
        </div>

        <!-- Liste -->
        <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
          <div
            v-for="sale in filteredSales"
            :key="sale.id"
            class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <!-- Ligne principale -->
            <button
              @click="toggleSaleDetails(sale.id)"
              class="w-full px-4 py-4 flex items-center gap-4 text-left"
            >
              <!-- Date/Heure -->
              <div class="hidden sm:block w-24 flex-shrink-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(sale.created_at) }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatTime(sale.created_at) }}</p>
              </div>

              <!-- Ticket -->
              <div class="flex-shrink-0">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-mono font-medium">
                  <Receipt class="w-3.5 h-3.5" />
                  {{ sale.ticket_number }}
                </span>
              </div>

              <!-- Vendeur -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ sale.client?.first_name }} {{ sale.client?.last_name }}
                </p>
                <p v-if="sale.vendor" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Vendeur: {{ sale.vendor.first_name }} {{ sale.vendor.last_name }}
                </p>
              </div>

              <!-- Paiement -->
              <div class="hidden md:flex items-center gap-2">
                <template v-for="payment in sale.payments" :key="payment.method">
                  <span class="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                    <component :is="paymentIcon(payment.method)" class="w-3.5 h-3.5" />
                    {{ paymentLabel(payment.method) }}
                  </span>
                </template>
              </div>

              <!-- Total -->
              <div class="text-right flex-shrink-0">
                <p class="text-lg font-bold text-gray-900 dark:text-white">{{ sale.total.toFixed(2) }}€</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 sm:hidden">{{ formatDate(sale.created_at) }}</p>
              </div>

              <!-- Chevron -->
              <component 
                :is="expandedSaleId === sale.id ? ChevronUp : ChevronDown" 
                class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
              />
            </button>

            <!-- Détails (expandable) -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-96"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100 max-h-96"
              leave-to-class="opacity-0 max-h-0"
            >
              <div v-if="expandedSaleId === sale.id" class="px-4 pb-4 overflow-hidden">
                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-4">
                  <!-- Articles -->
                  <div>
                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Articles</p>
                    <div class="space-y-2">
                      <div
                        v-for="item in sale.items"
                        :key="item.id"
                        class="flex items-center justify-between text-sm"
                      >
                        <span class="text-gray-700 dark:text-gray-300">
                          {{ item.quantity }}x {{ item.product_name }}
                        </span>
                        <span class="font-medium text-gray-900 dark:text-white">{{ item.subtotal_ttc.toFixed(2) }}€</span>
                      </div>
                    </div>
                  </div>

                  <!-- Totaux -->
                  <div class="border-t border-gray-200 dark:border-gray-600 pt-3 space-y-1">
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-500 dark:text-gray-400">Sous-total HT</span>
                      <span class="text-gray-700 dark:text-gray-300">{{ sale.subtotal_ht.toFixed(2) }}€</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-500 dark:text-gray-400">TVA</span>
                      <span class="text-gray-700 dark:text-gray-300">{{ sale.total_tva.toFixed(2) }}€</span>
                    </div>
                    <div v-if="sale.discount_amount > 0" class="flex justify-between text-sm">
                      <span class="text-gray-500 dark:text-gray-400">Remise</span>
                      <span class="text-red-600 dark:text-red-400">-{{ sale.discount_amount.toFixed(2) }}€</span>
                    </div>
                    <div class="flex justify-between text-base font-bold pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span class="text-gray-900 dark:text-white">Total</span>
                      <span class="text-gray-900 dark:text-white">{{ sale.total.toFixed(2) }}€</span>
                    </div>
                  </div>

                  <!-- Paiement + bouton modifier -->
                  <div class="border-t border-gray-200 dark:border-gray-600 pt-3 flex items-center justify-between gap-4 flex-wrap">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paiement</span>
                      <template v-for="payment in sale.payments" :key="payment.method">
                        <span class="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-500">
                          <component :is="paymentIcon(payment.method)" class="w-4 h-4" />
                          {{ paymentLabel(payment.method) }} — {{ payment.amount.toFixed(2) }}€
                        </span>
                        </template>
                    </div>
                    <button
                      @click.stop="openEditPayment(sale)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                    >
                      <Edit class="w-4 h-4" />
                      Modifier le paiement
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Pagination -->
        <div
          v-if="!isLoading && totalSalesCount != null && totalSalesCount > 0"
          class="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600 dark:text-gray-400">Page</span>
            <input
              v-model="pageInputValue"
              type="number"
              min="1"
              :max="totalPages"
              @keydown.enter="onPageInputSubmit"
              @blur="onPageInputSubmit"
              class="w-16 px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500"
            />
            <span class="text-sm text-gray-600 dark:text-gray-400">/ {{ totalPages }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              :disabled="currentPage <= 1"
              @click="goToPage(1)"
              title="Première page"
              class="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft class="w-5 h-5" />
            </button>
            <button
              :disabled="currentPage <= 1"
              @click="goToPage(currentPage - 1)"
              class="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft class="w-5 h-5" />
            </button>
            <div class="flex gap-1">
              <button
                v-for="p in visiblePages"
                :key="p"
                @click="goToPage(p)"
                :class="[
                  'min-w-[2.25rem] px-2 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  currentPage === p
                    ? 'bg-gray-900 dark:bg-emerald-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                ]"
              >
                {{ p }}
              </button>
            </div>
            <button
              :disabled="currentPage >= totalPages"
              @click="goToPage(currentPage + 1)"
              class="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight class="w-5 h-5" />
            </button>
            <button
              :disabled="currentPage >= totalPages"
              @click="goToPage(totalPages)"
              title="Dernière page"
              class="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Modifier le paiement -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="saleToEditPayment" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700">
          <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Modifier le mode de paiement</h3>
            <button @click="closeEditPayment" class="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X class="w-5 h-5" />
            </button>
          </div>
          <div class="p-4 space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Ticket <span class="font-mono font-semibold">{{ saleToEditPayment.ticket_number }}</span>
              — Total <span class="font-bold">{{ saleToEditPayment.total.toFixed(2) }}€</span>
            </p>
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Nouveau mode de paiement</label>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  v-for="pm in paymentMethodsList"
                  :key="pm.id"
                  @click="editPaymentMethod = pm.id"
                  :class="[
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors',
                    editPaymentMethod === pm.id
                      ? 'border-gray-900 dark:border-emerald-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  ]"
                >
                  <component :is="pm.icon" class="w-5 h-5" />
                  <span class="text-xs font-medium">{{ pm.label }}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button
              @click="closeEditPayment"
              class="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
            >
              Annuler
            </button>
            <button
              @click="saveEditPayment"
              :disabled="isSavingPayment"
              class="flex-1 px-4 py-2.5 bg-gray-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl hover:bg-gray-800 font-medium disabled:opacity-50"
            >
              {{ isSavingPayment ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>
