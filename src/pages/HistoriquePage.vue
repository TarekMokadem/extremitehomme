<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { 
  Search, 
  Calendar, 
  Euro, 
  User, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Receipt,
  CreditCard,
  Banknote,
  Filter,
  RefreshCw,
  Smartphone,
  FileText,
  Gift,
  Edit,
  X
} from 'lucide-vue-next';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Sale, PaymentMethod } from '../types/database';

// Types
interface SaleWithDetails extends Sale {
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
  vendor?: {
    first_name: string;
    last_name: string;
  };
  client?: {
    first_name: string;
    last_name: string;
  };
}

// State
const sales = ref<SaleWithDetails[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');
const dateFilter = ref('today'); // today, week, month, all
const expandedSaleId = ref<string | null>(null);
const saleToEditPayment = ref<SaleWithDetails | null>(null);
const editPaymentMethod = ref<PaymentMethod>('card');
const isSavingPayment = ref(false);

// Moyens de paiement (aligné avec la caisse)
const paymentMethodsList: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: 'cash', label: 'Espèces', icon: Banknote },
  { id: 'card', label: 'CB', icon: CreditCard },
  { id: 'contactless', label: 'Sans contact', icon: Smartphone },
  { id: 'check', label: 'Chèque', icon: FileText },
  { id: 'gift_card', label: 'Cadeau', icon: Gift },
];

// Filtres de date
const dateFilters = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'week', label: 'Cette semaine' },
  { id: 'month', label: 'Ce mois' },
  { id: 'all', label: 'Tout' },
];

// Charger les ventes
const loadSales = async () => {
  isLoading.value = true;
  
  if (!isSupabaseConfigured()) {
    // Mode démo
    sales.value = [];
    isLoading.value = false;
    return;
  }

  try {
    // Calculer les dates de filtre
    const now = new Date();
    let startDate: string | null = null;
    
    if (dateFilter.value === 'today') {
      startDate = now.toISOString().split('T')[0];
    } else if (dateFilter.value === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = weekAgo.toISOString().split('T')[0];
    } else if (dateFilter.value === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = monthAgo.toISOString().split('T')[0];
    }

    // Requête
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
      .limit(100);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

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
    case 'contactless': return CreditCard;
    default: return Euro;
  }
};

const paymentLabel = (method: PaymentMethod) => {
  const labels: Record<PaymentMethod, string> = {
    cash: 'Espèces',
    card: 'Carte',
    contactless: 'Sans contact',
    check: 'Chèque',
    gift_card: 'Carte cadeau',
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

// Watcher pour recharger quand le filtre change
import { watch } from 'vue';
watch(dateFilter, loadSales);
</script>

<template>
  <main class="flex-1 p-4 lg:p-6 overflow-auto">
    <div class="max-w-6xl mx-auto space-y-6">
      
      <!-- En-tête -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl lg:text-2xl font-bold text-gray-900">Historique des ventes</h1>
          <p class="text-sm text-gray-500 mt-1">Consultez toutes les transactions</p>
        </div>
        
        <button
          @click="loadSales"
          :disabled="isLoading"
          class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw :class="['w-4 h-4', isLoading && 'animate-spin']" />
          <span>Actualiser</span>
        </button>
      </div>

      <!-- Statistiques -->
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.total.toFixed(2) }}€</p>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Ventes</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.count }}</p>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Panier moyen</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.avgTicket.toFixed(2) }}€</p>
        </div>
      </div>

      <!-- Filtres -->
      <div class="flex flex-col sm:flex-row gap-4">
        <!-- Recherche -->
        <div class="relative flex-1">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher par ticket, client, vendeur..."
            class="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          />
        </div>

        <!-- Filtre date -->
        <div class="flex gap-2">
          <button
            v-for="filter in dateFilters"
            :key="filter.id"
            @click="dateFilter = filter.id"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-xl transition-colors',
              dateFilter === filter.id
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            ]"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>

      <!-- Liste des ventes -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <!-- Loading -->
        <div v-if="isLoading" class="p-8 text-center">
          <RefreshCw class="w-8 h-8 text-gray-400 animate-spin mx-auto" />
          <p class="text-sm text-gray-500 mt-2">Chargement...</p>
        </div>

        <!-- Vide -->
        <div v-else-if="filteredSales.length === 0" class="p-8 text-center">
          <Receipt class="w-12 h-12 text-gray-300 mx-auto" />
          <p class="text-gray-500 mt-2">Aucune vente trouvée</p>
        </div>

        <!-- Liste -->
        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="sale in filteredSales"
            :key="sale.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <!-- Ligne principale -->
            <button
              @click="toggleSaleDetails(sale.id)"
              class="w-full px-4 py-4 flex items-center gap-4 text-left"
            >
              <!-- Date/Heure -->
              <div class="hidden sm:block w-24 flex-shrink-0">
                <p class="text-sm font-medium text-gray-900">{{ formatDate(sale.created_at) }}</p>
                <p class="text-xs text-gray-500">{{ formatTime(sale.created_at) }}</p>
              </div>

              <!-- Ticket -->
              <div class="flex-shrink-0">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono font-medium">
                  <Receipt class="w-3.5 h-3.5" />
                  {{ sale.ticket_number }}
                </span>
              </div>

              <!-- Vendeur -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ sale.client?.first_name }} {{ sale.client?.last_name }}
                </p>
                <p v-if="sale.vendor" class="text-xs text-gray-500 truncate">
                  Vendeur: {{ sale.vendor.first_name }} {{ sale.vendor.last_name }}
                </p>
              </div>

              <!-- Paiement -->
              <div class="hidden md:flex items-center gap-2">
                <template v-for="payment in sale.payments" :key="payment.method">
                  <span class="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600">
                    <component :is="paymentIcon(payment.method)" class="w-3.5 h-3.5" />
                    {{ paymentLabel(payment.method) }}
                  </span>
                </template>
              </div>

              <!-- Total -->
              <div class="text-right flex-shrink-0">
                <p class="text-lg font-bold text-gray-900">{{ sale.total.toFixed(2) }}€</p>
                <p class="text-xs text-gray-500 sm:hidden">{{ formatDate(sale.created_at) }}</p>
              </div>

              <!-- Chevron -->
              <component 
                :is="expandedSaleId === sale.id ? ChevronUp : ChevronDown" 
                class="w-5 h-5 text-gray-400 flex-shrink-0"
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
                <div class="bg-gray-50 rounded-xl p-4 space-y-4">
                  <!-- Articles -->
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Articles</p>
                    <div class="space-y-2">
                      <div
                        v-for="item in sale.items"
                        :key="item.id"
                        class="flex items-center justify-between text-sm"
                      >
                        <span class="text-gray-700">
                          {{ item.quantity }}x {{ item.product_name }}
                        </span>
                        <span class="font-medium text-gray-900">{{ item.subtotal_ttc.toFixed(2) }}€</span>
                      </div>
                    </div>
                  </div>

                  <!-- Totaux -->
                  <div class="border-t border-gray-200 pt-3 space-y-1">
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-500">Sous-total HT</span>
                      <span class="text-gray-700">{{ sale.subtotal_ht.toFixed(2) }}€</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-500">TVA</span>
                      <span class="text-gray-700">{{ sale.total_tva.toFixed(2) }}€</span>
                    </div>
                    <div v-if="sale.discount_amount > 0" class="flex justify-between text-sm">
                      <span class="text-gray-500">Remise</span>
                      <span class="text-red-600">-{{ sale.discount_amount.toFixed(2) }}€</span>
                    </div>
                    <div class="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                      <span class="text-gray-900">Total</span>
                      <span class="text-gray-900">{{ sale.total.toFixed(2) }}€</span>
                    </div>
                  </div>

                  <!-- Paiement + bouton modifier -->
                  <div class="border-t border-gray-200 pt-3 flex items-center justify-between gap-4 flex-wrap">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Paiement</span>
                      <template v-for="payment in sale.payments" :key="payment.method">
                        <span class="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-sm text-gray-700 border border-gray-200">
                          <component :is="paymentIcon(payment.method)" class="w-4 h-4" />
                          {{ paymentLabel(payment.method) }} — {{ payment.amount.toFixed(2) }}€
                        </span>
                        </template>
                    </div>
                    <button
                      @click.stop="openEditPayment(sale)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div class="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900">Modifier le mode de paiement</h3>
            <button @click="closeEditPayment" class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <X class="w-5 h-5" />
            </button>
          </div>
          <div class="p-4 space-y-4">
            <p class="text-sm text-gray-600">
              Ticket <span class="font-mono font-semibold">{{ saleToEditPayment.ticket_number }}</span>
              — Total <span class="font-bold">{{ saleToEditPayment.total.toFixed(2) }}€</span>
            </p>
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Nouveau mode de paiement</label>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  v-for="pm in paymentMethodsList"
                  :key="pm.id"
                  @click="editPaymentMethod = pm.id"
                  :class="[
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors',
                    editPaymentMethod === pm.id
                      ? 'border-gray-900 bg-gray-50 text-gray-900'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  ]"
                >
                  <component :is="pm.icon" class="w-5 h-5" />
                  <span class="text-xs font-medium">{{ pm.label }}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="p-4 border-t border-gray-200 flex gap-3">
            <button
              @click="closeEditPayment"
              class="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
            >
              Annuler
            </button>
            <button
              @click="saveEditPayment"
              :disabled="isSavingPayment"
              class="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-medium disabled:opacity-50"
            >
              {{ isSavingPayment ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>
