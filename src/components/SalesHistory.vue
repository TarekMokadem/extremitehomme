<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { 
  X, 
  Receipt, 
  Calendar, 
  User, 
  CreditCard, 
  Banknote,
  Clock,
  ChevronDown,
  ChevronUp,
  XCircle,
  RefreshCw
} from 'lucide-vue-next';
import { useSales } from '../composables/useSales';
import type { Sale } from '../types/database';

// Props & Emits
const emit = defineEmits<{
  (e: 'close'): void;
}>();

// Composables
const { loadRecentSales, cancelSale, recentSales } = useSales();

// State
const isLoading = ref(true);
const expandedSaleId = ref<string | null>(null);
const filterDate = ref<string>('');

// Charger les ventes au montage
onMounted(async () => {
  isLoading.value = true;
  await loadRecentSales(50);
  isLoading.value = false;
});

// Filtrer les ventes par date
const filteredSales = computed(() => {
  if (!filterDate.value) return recentSales.value;
  
  return recentSales.value.filter(sale => {
    const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
    return saleDate === filterDate.value;
  });
});

// Formater le prix
const formatPrice = (price: number): string => {
  return price.toFixed(2);
};

// Formater la date
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Formater l'heure
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Toggle détails
const toggleDetails = (saleId: string) => {
  if (expandedSaleId.value === saleId) {
    expandedSaleId.value = null;
  } else {
    expandedSaleId.value = saleId;
  }
};

// Couleur du statut
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'bg-emerald-100 text-emerald-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    case 'refunded': return 'bg-orange-100 text-orange-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

// Label du statut
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'completed': return 'Validée';
    case 'cancelled': return 'Annulée';
    case 'refunded': return 'Remboursée';
    case 'pending': return 'En attente';
    default: return status;
  }
};

// Icône méthode de paiement
const getPaymentIcon = (method: string) => {
  switch (method) {
    case 'cash': return Banknote;
    case 'card':
    case 'contactless': return CreditCard;
    default: return CreditCard;
  }
};

// Annuler une vente
const handleCancelSale = async (sale: Sale) => {
  if (sale.status !== 'completed') return;
  
  const reason = prompt('Raison de l\'annulation :');
  if (!reason) return;
  
  const success = await cancelSale(sale.id, reason);
  if (success) {
    await loadRecentSales(50);
    alert('Vente annulée avec succès');
  } else {
    alert('Erreur lors de l\'annulation');
  }
};

// Rafraîchir
const handleRefresh = async () => {
  isLoading.value = true;
  await loadRecentSales(50);
  isLoading.value = false;
};

// Stats du jour
const todayStats = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  const todaySales = recentSales.value.filter(s => {
    const saleDate = new Date(s.created_at).toISOString().split('T')[0];
    return saleDate === today && s.status === 'completed';
  });
  
  return {
    count: todaySales.length,
    total: todaySales.reduce((sum, s) => sum + s.total, 0),
  };
});
</script>

<template>
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
              <Receipt class="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Historique des ventes</h2>
              <p class="text-sm text-gray-500">{{ recentSales.length }} ventes chargées</p>
            </div>
          </div>
          <button
            @click="emit('close')"
            class="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <!-- Stats du jour -->
        <div class="mt-4 grid grid-cols-2 gap-4">
          <div class="bg-white rounded-xl p-4 border border-gray-200">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Ventes du jour</p>
            <p class="text-2xl font-bold text-gray-900">{{ todayStats.count }}</p>
          </div>
          <div class="bg-white rounded-xl p-4 border border-gray-200">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">CA du jour</p>
            <p class="text-2xl font-bold text-emerald-600">{{ formatPrice(todayStats.total) }}€</p>
          </div>
        </div>
        
        <!-- Filtres -->
        <div class="mt-4 flex items-center gap-3">
          <div class="flex-1">
            <input
              v-model="filterDate"
              type="date"
              class="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="Filtrer par date"
            />
          </div>
          <button
            @click="filterDate = ''"
            v-if="filterDate"
            class="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Effacer
          </button>
          <button
            @click="handleRefresh"
            class="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            :class="{ 'animate-spin': isLoading }"
          >
            <RefreshCw class="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <!-- Liste des ventes -->
      <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
        
        <!-- Aucune vente -->
        <div v-else-if="filteredSales.length === 0" class="text-center py-12">
          <Receipt class="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p class="text-gray-500">Aucune vente trouvée</p>
        </div>
        
        <!-- Liste -->
        <div
          v-else
          v-for="sale in filteredSales"
          :key="sale.id"
          class="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
        >
          <!-- Ligne principale -->
          <button
            @click="toggleDetails(sale.id)"
            class="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center gap-4">
              <div class="text-left">
                <p class="font-semibold text-gray-900">{{ sale.ticket_number }}</p>
                <p class="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Calendar class="w-3 h-3" />
                  {{ formatDate(sale.created_at) }}
                  <Clock class="w-3 h-3 ml-2" />
                  {{ formatTime(sale.created_at) }}
                </p>
              </div>
            </div>
            
            <div class="flex items-center gap-4">
              <span :class="['px-2 py-1 rounded-full text-xs font-medium', getStatusColor(sale.status)]">
                {{ getStatusLabel(sale.status) }}
              </span>
              <span class="text-lg font-bold text-gray-900 tabular-nums">{{ formatPrice(sale.total) }}€</span>
              <component :is="expandedSaleId === sale.id ? ChevronUp : ChevronDown" class="w-5 h-5 text-gray-400" />
            </div>
          </button>
          
          <!-- Détails expandés -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-96"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 max-h-96"
            leave-to-class="opacity-0 max-h-0"
          >
            <div v-if="expandedSaleId === sale.id" class="border-t border-gray-200 p-4 bg-white">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Infos -->
                <div class="space-y-3">
                  <div class="flex items-center gap-2 text-sm">
                    <User class="w-4 h-4 text-gray-400" />
                    <span class="text-gray-600">Vendeur:</span>
                    <span class="font-medium">{{ (sale as any).vendor?.first_name }} {{ (sale as any).vendor?.last_name || 'N/A' }}</span>
                  </div>
                  <div v-if="(sale as any).client" class="flex items-center gap-2 text-sm">
                    <User class="w-4 h-4 text-gray-400" />
                    <span class="text-gray-600">Client:</span>
                    <span class="font-medium">{{ (sale as any).client?.first_name }} {{ (sale as any).client?.last_name }}</span>
                  </div>
                  
                  <!-- Paiements -->
                  <div class="space-y-1">
                    <p class="text-xs text-gray-500 uppercase tracking-wider">Paiements</p>
                    <div
                      v-for="(payment, idx) in (sale as any).payments || []"
                      :key="idx"
                      class="flex items-center gap-2 text-sm"
                    >
                      <component :is="getPaymentIcon(payment.method)" class="w-4 h-4 text-gray-400" />
                      <span class="capitalize">{{ payment.method }}</span>
                      <span class="font-medium">{{ formatPrice(payment.amount) }}€</span>
                    </div>
                  </div>
                </div>
                
                <!-- Articles -->
                <div>
                  <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">Articles</p>
                  <div class="space-y-1">
                    <div
                      v-for="(item, idx) in (sale as any).items || []"
                      :key="idx"
                      class="flex items-center justify-between text-sm"
                    >
                      <span>{{ item.quantity }}x {{ item.product_name }}</span>
                      <span class="font-medium tabular-nums">{{ formatPrice(item.subtotal_ttc) }}€</span>
                    </div>
                  </div>
                  
                  <!-- Totaux -->
                  <div class="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-500">Sous-total HT</span>
                      <span>{{ formatPrice(sale.subtotal_ht) }}€</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">TVA</span>
                      <span>{{ formatPrice(sale.total_tva) }}€</span>
                    </div>
                    <div v-if="sale.discount_amount > 0" class="flex justify-between text-red-600">
                      <span>Réduction</span>
                      <span>-{{ formatPrice(sale.discount_amount) }}€</span>
                    </div>
                    <div class="flex justify-between font-bold text-base pt-2">
                      <span>Total</span>
                      <span>{{ formatPrice(sale.total) }}€</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Actions -->
              <div v-if="sale.status === 'completed'" class="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                <button
                  @click="handleCancelSale(sale)"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <XCircle class="w-4 h-4" />
                  Annuler cette vente
                </button>
              </div>
              
              <!-- Notes si annulée -->
              <div v-if="sale.status === 'cancelled' && sale.notes" class="mt-4 p-3 bg-red-50 rounded-lg">
                <p class="text-sm text-red-700">
                  <strong>Raison annulation:</strong> {{ sale.notes }}
                </p>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>
