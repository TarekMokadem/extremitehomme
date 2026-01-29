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
  X,
  Edit,
  Trash2,
  RefreshCw,
  History
} from 'lucide-vue-next';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Client, Sale } from '../types/database';

// State
const clients = ref<Client[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');
const selectedClient = ref<Client | null>(null);
const clientSales = ref<Sale[]>([]);
const isLoadingSales = ref(false);
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

// Charger les clients
const loadClients = async () => {
  isLoading.value = true;
  
  if (!isSupabaseConfigured()) {
    clients.value = [];
    isLoading.value = false;
    return;
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('last_name');

    if (error) throw error;
    clients.value = data || [];
  } catch (err) {
    console.error('Erreur chargement clients:', err);
    clients.value = [];
  } finally {
    isLoading.value = false;
  }
};

// Charger les ventes d'un client
const loadClientSales = async (clientId: string) => {
  isLoadingSales.value = true;
  
  try {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(product_name, quantity, subtotal_ttc),
        vendor:vendors(first_name, last_name)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    clientSales.value = data || [];
  } catch (err) {
    console.error('Erreur chargement ventes client:', err);
    clientSales.value = [];
  } finally {
    isLoadingSales.value = false;
  }
};

// Filtrer les clients
const filteredClients = computed(() => {
  if (!searchQuery.value.trim()) return clients.value;
  
  const q = searchQuery.value.toLowerCase();
  return clients.value.filter(client => 
    client.first_name.toLowerCase().includes(q) ||
    client.last_name.toLowerCase().includes(q) ||
    client.phone.includes(q) ||
    client.email?.toLowerCase().includes(q)
  );
});

// Sélectionner un client
const selectClient = (client: Client) => {
  selectedClient.value = client;
  loadClientSales(client.id);
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
      })
      .eq('id', editForm.value.id);

    if (error) throw error;
    
    // Recharger les clients
    await loadClients();
    
    // Mettre à jour le client sélectionné
    if (selectedClient.value?.id === editForm.value.id) {
      const updated = clients.value.find(c => c.id === editForm.value.id);
      if (updated) selectedClient.value = updated;
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
  <main class="flex-1 flex overflow-hidden">
    <!-- Liste des clients -->
    <div class="flex-1 flex flex-col min-w-0 border-r border-gray-200">
      <!-- Header -->
      <div class="p-4 lg:p-6 border-b border-gray-200 bg-white">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-xl lg:text-2xl font-bold text-gray-900">Clients</h1>
            <p class="text-sm text-gray-500">{{ clients.length }} clients enregistrés</p>
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
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher par nom, téléphone, email..."
            class="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
      </div>

      <!-- Liste -->
      <div class="flex-1 overflow-y-auto">
        <!-- Loading -->
        <div v-if="isLoading" class="p-8 text-center">
          <RefreshCw class="w-8 h-8 text-gray-400 animate-spin mx-auto" />
        </div>

        <!-- Vide -->
        <div v-else-if="filteredClients.length === 0" class="p-8 text-center">
          <UserPlus class="w-12 h-12 text-gray-300 mx-auto" />
          <p class="text-gray-500 mt-2">Aucun client trouvé</p>
        </div>

        <!-- Liste des clients -->
        <div v-else class="divide-y divide-gray-100">
          <button
            v-for="client in filteredClients"
            :key="client.id"
            @click="selectClient(client)"
            :class="[
              'w-full px-4 lg:px-6 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors',
              selectedClient?.id === client.id && 'bg-blue-50 hover:bg-blue-50'
            ]"
          >
            <!-- Avatar -->
            <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span class="text-lg font-semibold text-gray-600">
                {{ client.first_name[0] }}{{ client.last_name[0] }}
              </span>
            </div>

            <!-- Infos -->
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 truncate">
                {{ client.first_name }} {{ client.last_name }}
              </p>
              <p class="text-sm text-gray-500 truncate">{{ client.phone }}</p>
            </div>

            <!-- Stats -->
            <div class="hidden sm:block text-right flex-shrink-0">
              <p class="text-sm font-medium text-gray-900">{{ client.total_spent?.toFixed(2) || '0.00' }}€</p>
              <p class="text-xs text-gray-500">{{ client.visit_count || 0 }} visites</p>
            </div>

            <ChevronRight class="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>

    <!-- Panneau détails client -->
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
        class="w-full lg:w-[450px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden absolute lg:relative inset-0 lg:inset-auto z-10"
      >
        <!-- Header -->
        <div class="p-4 lg:p-6 border-b border-gray-200 flex items-start justify-between">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <span class="text-2xl font-bold text-blue-600">
                {{ selectedClient.first_name[0] }}{{ selectedClient.last_name[0] }}
              </span>
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900">
                {{ selectedClient.first_name }} {{ selectedClient.last_name }}
              </h2>
              <p class="text-sm text-gray-500">Client depuis {{ formatDate(selectedClient.created_at) }}</p>
            </div>
          </div>
          <button
            @click="closeDetails"
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Contenu -->
        <div class="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          <!-- Stats -->
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-gray-50 rounded-xl p-3 text-center">
              <Euro class="w-5 h-5 text-gray-400 mx-auto" />
              <p class="text-lg font-bold text-gray-900 mt-1">{{ selectedClient.total_spent?.toFixed(0) || '0' }}€</p>
              <p class="text-xs text-gray-500">Total dépensé</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-3 text-center">
              <ShoppingBag class="w-5 h-5 text-gray-400 mx-auto" />
              <p class="text-lg font-bold text-gray-900 mt-1">{{ selectedClient.visit_count || 0 }}</p>
              <p class="text-xs text-gray-500">Visites</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-3 text-center">
              <Star class="w-5 h-5 text-gray-400 mx-auto" />
              <p class="text-lg font-bold text-gray-900 mt-1">{{ selectedClient.loyalty_points || 0 }}</p>
              <p class="text-xs text-gray-500">Points</p>
            </div>
          </div>

          <!-- Coordonnées -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider">Coordonnées</h3>
            
            <div class="space-y-2">
              <div class="flex items-center gap-3 text-sm">
                <Phone class="w-4 h-4 text-gray-400" />
                <span class="text-gray-900">{{ selectedClient.phone }}</span>
              </div>
              <div v-if="selectedClient.phone2" class="flex items-center gap-3 text-sm">
                <Phone class="w-4 h-4 text-gray-400" />
                <span class="text-gray-700">{{ selectedClient.phone2 }}</span>
              </div>
              <div v-if="selectedClient.email" class="flex items-center gap-3 text-sm">
                <Mail class="w-4 h-4 text-gray-400" />
                <span class="text-gray-700">{{ selectedClient.email }}</span>
              </div>
              <div v-if="selectedClient.address" class="flex items-start gap-3 text-sm">
                <MapPin class="w-4 h-4 text-gray-400 mt-0.5" />
                <span class="text-gray-700">
                  {{ selectedClient.address }}<br>
                  {{ selectedClient.postal_code }} {{ selectedClient.city }}
                </span>
              </div>
              <div v-if="selectedClient.birth_date" class="flex items-center gap-3 text-sm">
                <Calendar class="w-4 h-4 text-gray-400" />
                <span class="text-gray-700">{{ formatDate(selectedClient.birth_date) }}</span>
              </div>
            </div>

            <div v-if="selectedClient.notes" class="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
              {{ selectedClient.notes }}
            </div>
          </div>

          <!-- Historique des achats -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <History class="w-4 h-4" />
              Historique des achats
            </h3>

            <div v-if="isLoadingSales" class="py-4 text-center">
              <RefreshCw class="w-5 h-5 text-gray-400 animate-spin mx-auto" />
            </div>

            <div v-else-if="clientSales.length === 0" class="py-4 text-center text-gray-500 text-sm">
              Aucun achat enregistré
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="sale in clientSales"
                :key="sale.id"
                class="bg-gray-50 rounded-lg p-3"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs text-gray-500">{{ formatDate(sale.created_at) }}</span>
                  <span class="font-semibold text-gray-900">{{ sale.total.toFixed(2) }}€</span>
                </div>
                <div class="text-xs text-gray-600">
                  <span v-for="(item, i) in (sale as any).items" :key="i">
                    {{ item.quantity }}x {{ item.product_name }}<span v-if="i < (sale as any).items.length - 1">, </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="p-4 border-t border-gray-200 flex gap-3">
          <button
            @click="openEditModal(selectedClient)"
            class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Edit class="w-4 h-4" />
            Modifier
          </button>
          <button
            @click="showDeleteConfirm = true"
            class="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
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
                <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Prénom</label>
                <input v-model="editForm.first_name" type="text" required class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Nom</label>
                <input v-model="editForm.last_name" type="text" required class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Téléphone</label>
                <input v-model="editForm.phone" type="tel" required class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Tél. 2</label>
                <input v-model="editForm.phone2" type="tel" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Email</label>
              <input v-model="editForm.email" type="email" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Adresse</label>
              <input v-model="editForm.address" type="text" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Ville</label>
                <input v-model="editForm.city" type="text" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Code postal</label>
                <input v-model="editForm.postal_code" type="text" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Date de naissance</label>
              <input v-model="editForm.birth_date" type="date" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">Notes</label>
              <textarea v-model="editForm.notes" rows="2" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900 resize-none"></textarea>
            </div>

            <div class="flex gap-3 pt-4">
              <button type="button" @click="showEditModal = false" class="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" class="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800">
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
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
          <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Trash2 class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Supprimer ce client ?</h3>
          <p class="text-sm text-gray-500 mb-6">
            {{ selectedClient?.first_name }} {{ selectedClient?.last_name }} sera définitivement supprimé.
          </p>
          <div class="flex gap-3">
            <button @click="showDeleteConfirm = false" class="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50">
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
