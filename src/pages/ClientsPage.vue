<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  Euro,
  ShoppingBag,
  Star,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  X,
  Edit,
  Trash2,
  RefreshCw,
  History
} from 'lucide-vue-next';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useLoyalty } from '../composables/useLoyalty';
import type { Client, Sale } from '../types/database';

// State
const clients = ref<Client[]>([]);
const totalClientsCount = ref<number>(0);
const isLoading = ref(true);
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(50);
const pageSizeOptions = [25, 50, 100];
const selectedClient = ref<Client | null>(null);
const clientSales = ref<Sale[]>([]);
const isLoadingSales = ref(false);
const { loadClientStamps, checkedCount } = useLoyalty();

// Stats du client sélectionné, calculées depuis l'historique des achats (et points fidélité) pour cohérence avec l'affichage
const selectedClientStats = computed(() => {
  if (!selectedClient.value) return { totalSpent: 0, visitCount: 0, loyaltyPoints: 0 };
  const totalSpent = clientSales.value.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const visitCount = clientSales.value.length;
  return {
    totalSpent,
    visitCount,
    loyaltyPoints: checkedCount.value,
  };
});
const showEditModal = ref(false);
const showDeleteConfirm = ref(false);

// Formulaire d'édition
const editForm = ref({
  id: '',
  first_name: '',
  last_name: '',
  phone: '',
  phone2: '',
  email: '',
  address: '',
  city: '',
  postal_code: '',
  birth_date: '',
  notes: '',
});

// Pagination
const totalPages = computed(() => Math.max(1, Math.ceil(totalClientsCount.value / pageSize.value)));
const paginationInfo = computed(() => {
  const total = totalClientsCount.value;
  const size = pageSize.value;
  const page = currentPage.value;
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  return { from, to, total };
});
const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const delta = 2;
  const pages: number[] = [];
  for (let p = Math.max(1, current - delta); p <= Math.min(total, current + delta); p++) {
    pages.push(p);
  }
  return pages;
});

// Charger les clients (pagination + recherche serveur)
const loadClients = async () => {
  isLoading.value = true;
  
  if (!isSupabaseConfigured()) {
    clients.value = [];
    totalClientsCount.value = 0;
    isLoading.value = false;
    return;
  }

  try {
    const size = pageSize.value;
    const page = currentPage.value;
    const from = (page - 1) * size;
    const to = from + size - 1;
    const q = searchQuery.value.trim();

    // Requête avec filtre recherche si présent
    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .order('last_name')
      .range(from, to);

    if (q) {
      query = query.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;
    clients.value = data || [];
    totalClientsCount.value = count ?? 0;
  } catch (err) {
    console.error('Erreur chargement clients:', err);
    clients.value = [];
    totalClientsCount.value = 0;
  } finally {
    isLoading.value = false;
  }
};

const goToPage = (p: number) => {
  currentPage.value = Math.max(1, Math.min(p, totalPages.value));
  loadClients();
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

// Charger les ventes d'un client
const loadClientSales = async (clientId: string) => {
  isLoadingSales.value = true;
  
  try {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        total,
        created_at,
        items:sale_items(product_name, quantity, subtotal_ttc),
        vendor:vendors(first_name, last_name)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;
    clientSales.value = data || [];
  } catch (err) {
    console.error('Erreur chargement ventes client:', err);
    clientSales.value = [];
  } finally {
    isLoadingSales.value = false;
  }
};

// Recherche serveur : recharger quand la recherche change (avec debounce)
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, () => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    currentPage.value = 1;
    loadClients();
  }, 300);
});

watch([currentPage, pageSize], () => loadClients());
watch(currentPage, () => syncPageInput(), { immediate: true });

// Sélectionner un client
const selectClient = (client: Client) => {
  selectedClient.value = client;
  loadClientSales(client.id);
  loadClientStamps(client.id);
};

// Fermer le panneau détails
const closeDetails = () => {
  selectedClient.value = null;
  clientSales.value = [];
};

// Ouvrir le modal d'édition
const openEditModal = (client: Client) => {
  editForm.value = {
    id: client.id,
    first_name: client.first_name,
    last_name: client.last_name,
    phone: client.phone,
    phone2: client.phone2 || '',
    email: client.email || '',
    address: client.address || '',
    city: client.city || '',
    postal_code: client.postal_code || '',
    birth_date: client.birth_date || '',
    notes: client.notes || '',
  };
  showEditModal.value = true;
};

// Sauvegarder les modifications
const saveClient = async () => {
  if (!editForm.value.id) return;
  
  try {
    const { error } = await supabase
      .from('clients')
      .update({
        first_name: editForm.value.first_name,
        last_name: editForm.value.last_name,
        phone: editForm.value.phone,
        phone2: editForm.value.phone2 || null,
        email: editForm.value.email || null,
        address: editForm.value.address || null,
        city: editForm.value.city || null,
        postal_code: editForm.value.postal_code || null,
        birth_date: editForm.value.birth_date || null,
        notes: editForm.value.notes || null,
      } as any)
      .eq('id', editForm.value.id);

    if (error) throw error;
    
    // Recharger les clients
    await loadClients();
    
    // Mettre à jour le client sélectionné (peut ne pas être sur la page courante)
    if (selectedClient.value?.id === editForm.value.id) {
      const updated = clients.value.find(c => c.id === editForm.value.id);
      if (updated) {
        selectedClient.value = updated;
      } else {
        selectedClient.value = { ...selectedClient.value!, ...editForm.value } as Client;
      }
    }
    
    showEditModal.value = false;
    alert('Client mis à jour !');
  } catch (err) {
    console.error('Erreur mise à jour:', err);
    alert('Erreur lors de la mise à jour');
  }
};

// Supprimer un client
const deleteClient = async () => {
  if (!selectedClient.value) return;
  
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', selectedClient.value.id);

    if (error) throw error;
    
    closeDetails();
    await loadClients();
    showDeleteConfirm.value = false;
    alert('Client supprimé !');
  } catch (err) {
    console.error('Erreur suppression:', err);
    alert('Erreur lors de la suppression');
  }
};

// Formater la date
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR');
};

// Lifecycle
onMounted(loadClients);
</script>

<template>
  <main class="flex-1 flex overflow-hidden bg-gray-50 dark:bg-gray-900">
    <!-- Liste des clients (scrollable) - réduite quand panneau ouvert -->
    <div :class="[
      'flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-800 overflow-hidden transition-all duration-200',
      selectedClient ? 'lg:mr-[450px]' : ''
    ]">
      <!-- Header (sticky dans la liste) -->
      <div class="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ totalClientsCount }} clients enregistrés</p>
          </div>
          <button
            @click="loadClients"
            :disabled="isLoading"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw :class="['w-5 h-5', isLoading && 'animate-spin']" />
          </button>
        </div>

        <!-- Recherche -->
        <div class="relative">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher par nom, téléphone, email..."
            class="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl text-sm focus:outline-none focus:border-gray-900 dark:focus:border-emerald-500 focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-emerald-500/30"
          />
        </div>

        <!-- Pagination : taille page + infos -->
        <div class="flex flex-wrap items-center justify-between gap-3 mt-3">
          <p v-if="totalClientsCount > 0" class="text-sm text-gray-500 dark:text-gray-400">
            {{ paginationInfo.from }}-{{ paginationInfo.to }} sur {{ paginationInfo.total }} clients
          </p>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">Par page</span>
            <select
              v-model.number="pageSize"
              class="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-gray-100"
            >
              <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Liste -->
      <div class="flex-1 overflow-y-auto">
        <!-- Loading -->
        <div v-if="isLoading" class="p-8 text-center">
          <RefreshCw class="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin mx-auto" />
        </div>

        <!-- Vide -->
        <div v-else-if="clients.length === 0" class="p-8 text-center">
          <UserPlus class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <p class="text-gray-500 dark:text-gray-400 mt-2">Aucun client trouvé</p>
        </div>

        <!-- Liste des clients -->
        <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
          <button
            v-for="client in clients"
            :key="client.id"
            @click="selectClient(client)"
            :class="[
              'w-full px-4 lg:px-6 py-4 flex items-center gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
              selectedClient?.id === client.id && 'bg-blue-50 dark:bg-emerald-900/30 hover:bg-blue-50 dark:hover:bg-emerald-900/30'
            ]"
          >
            <!-- Avatar -->
            <div class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
              <span class="text-lg font-semibold text-gray-600 dark:text-gray-200">
                {{ client.first_name[0] }}{{ client.last_name[0] }}
              </span>
            </div>

            <!-- Infos -->
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 dark:text-white truncate">
                {{ client.first_name }} {{ client.last_name }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ client.phone }}</p>
            </div>

            <ChevronRight class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          </button>
        </div>

        <!-- Pagination -->
        <div
          v-if="!isLoading && totalClientsCount > 0"
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

    <!-- Panneau détails client (fixe à droite, sous le header) -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-full opacity-0"
    >
      <div
        v-if="selectedClient"
        class="w-full lg:w-[450px] lg:max-h-[65vh] flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col fixed inset-0 lg:top-[10%] lg:right-4 lg:bottom-auto lg:left-auto z-20 shadow-xl rounded-xl overflow-hidden"
      >
        <!-- Header -->
        <div class="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <span class="text-2xl font-bold text-blue-600 dark:text-blue-300">
                {{ selectedClient.first_name[0] }}{{ selectedClient.last_name[0] }}
              </span>
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ selectedClient.first_name }} {{ selectedClient.last_name }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">Client depuis {{ formatDate(selectedClient.created_at) }}</p>
            </div>
          </div>
          <button
            @click="closeDetails"
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Contenu -->
        <div class="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          <!-- Stats (calculées depuis l'historique des achats et la fidélité pour cohérence) -->
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
              <Euro class="w-5 h-5 text-gray-400 dark:text-gray-500 mx-auto" />
              <p class="text-lg font-bold text-gray-900 dark:text-white mt-1">{{ selectedClientStats.totalSpent.toFixed(0) }}€</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Total dépensé</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
              <ShoppingBag class="w-5 h-5 text-gray-400 dark:text-gray-500 mx-auto" />
              <p class="text-lg font-bold text-gray-900 dark:text-white mt-1">{{ selectedClientStats.visitCount }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Visites</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
              <Star class="w-5 h-5 text-gray-400 dark:text-gray-500 mx-auto" />
              <p class="text-lg font-bold text-gray-900 dark:text-white mt-1">{{ selectedClientStats.loyaltyPoints }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Points</p>
            </div>
          </div>

          <!-- Coordonnées -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Coordonnées</h3>
            
            <div class="space-y-2">
              <div class="flex items-center gap-3 text-sm">
                <Phone class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span class="text-gray-900 dark:text-gray-100">{{ selectedClient.phone }}</span>
              </div>
              <div v-if="selectedClient.phone2" class="flex items-center gap-3 text-sm">
                <Phone class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span class="text-gray-700 dark:text-gray-300">{{ selectedClient.phone2 }}</span>
              </div>
              <div v-if="selectedClient.email" class="flex items-center gap-3 text-sm">
                <Mail class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span class="text-gray-700 dark:text-gray-300">{{ selectedClient.email }}</span>
              </div>
              <div v-if="selectedClient.address" class="flex items-start gap-3 text-sm">
                <MapPin class="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                <span class="text-gray-700 dark:text-gray-300">
                  {{ selectedClient.address }}<br>
                  {{ selectedClient.postal_code }} {{ selectedClient.city }}
                </span>
              </div>
              <div v-if="selectedClient.birth_date" class="flex items-center gap-3 text-sm">
                <Calendar class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span class="text-gray-700 dark:text-gray-300">{{ formatDate(selectedClient.birth_date) }}</span>
              </div>
            </div>

            <div v-if="selectedClient.notes" class="mt-3 p-3 bg-yellow-50 dark:bg-amber-900/30 rounded-lg text-sm text-yellow-800 dark:text-amber-200">
              {{ selectedClient.notes }}
            </div>
          </div>

          <!-- Historique des achats -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <History class="w-4 h-4" />
              Historique des achats
            </h3>

            <div v-if="isLoadingSales" class="py-4 text-center">
              <RefreshCw class="w-5 h-5 text-gray-400 dark:text-gray-500 animate-spin mx-auto" />
            </div>

            <div v-else-if="clientSales.length === 0" class="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              Aucun achat enregistré
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="sale in clientSales"
                :key="sale.id"
                class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(sale.created_at) }}</span>
                  <span class="font-semibold text-gray-900 dark:text-white">{{ sale.total.toFixed(2) }}€</span>
                </div>
                <ul v-if="sale.items?.length" class="mt-1 space-y-0.5 text-sm text-gray-600 dark:text-gray-300">
                  <li v-for="(item, i) in sale.items" :key="i">
                    {{ item.quantity }}× {{ item.product_name }}
                  </li>
                </ul>
                <p v-else class="text-xs text-gray-500 dark:text-gray-400 italic mt-1">Détails non disponibles</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            @click="openEditModal(selectedClient)"
            class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Edit class="w-4 h-4" />
            Modifier
          </button>
          <button
            @click="showDeleteConfirm = true"
            class="px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </Transition>

    <!-- Modal d'édition -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900">Modifier le client</h3>
            <button @click="showEditModal = false" class="p-2 hover:bg-gray-100 rounded-lg">
              <X class="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form @submit.prevent="saveClient" class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Prénom</label>
                <input v-model="editForm.first_name" type="text" required class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-gray-900 dark:focus:border-emerald-500" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Nom</label>
                <input v-model="editForm.last_name" type="text" required class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-gray-900 dark:focus:border-emerald-500" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Téléphone</label>
                <input v-model="editForm.phone" type="tel" required class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-gray-900 dark:focus:border-emerald-500" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Tél. 2</label>
                <input v-model="editForm.phone2" type="tel" class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-gray-900 dark:focus:border-emerald-500" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Email</label>
              <input v-model="editForm.email" type="email" class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-gray-900 dark:focus:border-emerald-500" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Adresse</label>
              <input v-model="editForm.address" type="text" class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-gray-900 dark:focus:border-emerald-500" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Ville</label>
                <input v-model="editForm.city" type="text" class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-gray-900 dark:focus:border-emerald-500" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Code postal</label>
                <input v-model="editForm.postal_code" type="text" class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-gray-900 dark:focus:border-emerald-500" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Date de naissance</label>
              <input v-model="editForm.birth_date" type="date" class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-gray-900 dark:focus:border-emerald-500" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Notes</label>
              <textarea v-model="editForm.notes" rows="2" class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-gray-900 dark:focus:border-emerald-500 resize-none"></textarea>
            </div>

            <div class="flex gap-3 pt-4">
              <button type="button" @click="showEditModal = false" class="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">
                Annuler
              </button>
              <button type="submit" class="flex-1 px-4 py-2.5 bg-gray-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl hover:bg-gray-800">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Confirmation suppression -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-gray-200 dark:border-gray-700">
          <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Trash2 class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Supprimer ce client ?</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {{ selectedClient?.first_name }} {{ selectedClient?.last_name }} sera définitivement supprimé.
          </p>
          <div class="flex gap-3">
            <button @click="showDeleteConfirm = false" class="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">
              Annuler
            </button>
            <button @click="deleteClient" class="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700">
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>
