<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, Save, Trash2, History, MapPin, UserPlus, UserPen } from 'lucide-vue-next';
import { useClient } from '../composables/useClient';
import { useClients } from '../composables/useClients';
import type { Client } from '../types';
import type { Client as DBClient } from '../types/database';

// Composables
const { currentClient, isEditMode, clearClient, loadClient, hasClientInfo, saveClient } = useClient();
const { searchClients, selectClient: setSelectedClient, clearSelection } = useClients();

// State local
const searchQuery = ref<string>('');
const clientSearchResults = ref<DBClient[]>([]);
const isSearching = ref(false);

// Recherche de clients avec debounce
let searchDebounceTimer: number | null = null;

watch(searchQuery, (newQuery) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  
  if (newQuery.trim().length < 2) {
    clientSearchResults.value = [];
    return;
  }
  
  searchDebounceTimer = window.setTimeout(async () => {
    isSearching.value = true;
    try {
      const results = await searchClients(newQuery);
      clientSearchResults.value = results;
    } catch (error) {
      console.error('Erreur recherche clients:', error);
      clientSearchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  }, 300);
});

const showClientSearch = computed(() => searchQuery.value.trim().length >= 2 && clientSearchResults.value.length > 0);

// Handlers
const handleSave = async (): Promise<void> => {
  const result = await saveClient();
  if (result.success) {
    alert(result.message);
  } else {
    alert(result.message);
  }
};

const handleClear = (): void => {
  clearClient();
  searchQuery.value = '';
  clearSelection();
};

const handleShowHistory = (): void => {
  alert('Historique client à implémenter');
};

const selectClient = (dbClient: DBClient): void => {
  // Mettre à jour la sélection globale (carte fidélité, ticket, etc.)
  setSelectedClient(dbClient);
  // Convertir du format BDD (snake_case) vers le format formulaire (camelCase)
  const client: Client = {
    id: dbClient.id,
    firstName: dbClient.first_name,
    lastName: dbClient.last_name,
    phone: dbClient.phone,
    phone2: dbClient.phone2 || '',
    email: dbClient.email || '',
    address: dbClient.address || '',
    city: dbClient.city || '',
    postalCode: dbClient.postal_code || '',
    birthDate: dbClient.birth_date || '',
    notes: dbClient.notes || '',
  };
  // Charger toutes les données du client dans le formulaire
  loadClient(client);
  searchQuery.value = `${client.firstName} ${client.lastName}`;
  // Fermer la liste de recherche
  clientSearchResults.value = [];
};

// Sélectionner le premier client avec Entrée
const handleClientSearchKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Enter' && clientSearchResults.value.length > 0) {
    event.preventDefault();
    selectClient(clientSearchResults.value[0]);
  }
};

// Labels des champs
const formFields = [
  { key: 'lastName', label: 'Nom', type: 'text', placeholder: 'Dupont', span: 1 },
  { key: 'firstName', label: 'Prénom', type: 'text', placeholder: 'Jean', span: 1 },
  { key: 'phone', label: 'Tél. 1', type: 'tel', placeholder: '06 12 34 56 78', span: 1 },
  { key: 'phone2', label: 'Tél. 2', type: 'tel', placeholder: '01 23 45 67 89', span: 1 },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'jean@email.com', span: 2 },
  { key: 'birthDate', label: 'Anniversaire', type: 'date', placeholder: '', span: 2 },
] as const;

</script>

<template>
  <div class="card h-full flex flex-col overflow-hidden">
    <!-- En-tête avec recherche -->
    <div class="p-4 md:p-6 border-b border-gray-200 bg-white">
      <div class="flex items-center justify-between mb-3 md:mb-4">
        <h2 class="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-wider">Client</h2>
        <!-- Badge mode création/modification -->
        <div 
          v-if="hasClientInfo"
          :class="[
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold transition-colors',
            isEditMode 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-emerald-100 text-emerald-700'
          ]"
        >
          <component :is="isEditMode ? UserPen : UserPlus" class="w-3 h-3" />
          <span>{{ isEditMode ? 'Modification' : 'Nouveau' }}</span>
        </div>
      </div>
      <div class="relative">
        <Search class="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400 pointer-events-none z-10" />
        <input
          v-model="searchQuery"
          @keydown="handleClientSearchKeydown"
          type="text"
          placeholder="Rechercher un client..."
          class="w-full pl-11 md:pl-14 pr-4 md:pr-5 py-3 md:py-3.5 bg-gray-50 border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 hover:border-gray-400 transition-all"
          autocomplete="off"
        />

        <!-- Résultats recherche client -->
        <Transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <div
            v-if="showClientSearch"
            class="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50"
          >
            <button
              v-for="client in clientSearchResults"
              :key="client.id"
              @click="selectClient(client)"
              class="w-full px-4 md:px-5 py-2.5 md:py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <p class="text-xs md:text-sm font-medium text-gray-900">{{ client.first_name }} {{ client.last_name }}</p>
              <p class="text-[10px] md:text-xs text-gray-500 mt-0.5">{{ client.phone }}</p>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Formulaire client -->
    <div class="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 space-y-4 md:space-y-5 bg-gray-50">
      <!-- Champs du formulaire -->
      <div class="grid grid-cols-2 gap-3 md:gap-4">
        <div
          v-for="field in formFields.filter(f => f.span !== 2)"
          :key="field.key"
          class="space-y-1.5 md:space-y-2"
        >
          <label class="block text-[10px] md:text-xs text-gray-600 font-semibold uppercase tracking-wider">
            {{ field.label }}
          </label>
          <input
            v-model="(currentClient as any)[field.key]"
            :type="field.type"
            :placeholder="field.placeholder"
            class="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 hover:border-gray-400 transition-all"
          />
        </div>
        
        <!-- Champs pleine largeur -->
        <template v-for="field in formFields.filter(f => f.span === 2)" :key="field.key">
          <div class="col-span-2 space-y-1.5 md:space-y-2">
            <label class="block text-[10px] md:text-xs text-gray-600 font-semibold uppercase tracking-wider">
              {{ field.label }}
            </label>
            <input
              v-model="(currentClient as any)[field.key]"
              :type="field.type"
              :placeholder="field.placeholder"
              class="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 hover:border-gray-400 transition-all"
            />
          </div>
        </template>
      </div>

      <!-- Adresse -->
      <div class="col-span-2 space-y-1.5 md:space-y-2">
        <label class="block text-[10px] md:text-xs text-gray-600 font-semibold uppercase tracking-wider flex items-center gap-1.5 md:gap-2">
          <MapPin class="w-3 h-3 md:w-3.5 md:h-3.5" />
          <span>Adresse</span>
        </label>
        <input
          v-model="currentClient.address"
          type="text"
          placeholder="123 Rue de la Paix"
          class="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 hover:border-gray-400 transition-all"
        />
      </div>

      <!-- Ville et Code postal -->
      <div class="grid grid-cols-2 gap-3 md:gap-4">
        <div class="space-y-1.5 md:space-y-2">
          <label class="block text-[10px] md:text-xs text-gray-600 font-semibold uppercase tracking-wider">
            Ville
          </label>
          <input
            v-model="currentClient.city"
            type="text"
            placeholder="Paris"
            class="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 hover:border-gray-400 transition-all"
          />
        </div>
        <div class="space-y-1.5 md:space-y-2">
          <label class="block text-[10px] md:text-xs text-gray-600 font-semibold uppercase tracking-wider">
            CP
          </label>
          <input
            v-model="currentClient.postalCode"
            type="text"
            placeholder="75001"
            class="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 hover:border-gray-400 transition-all"
          />
        </div>
      </div>

      <!-- Notes / Commentaire -->
      <div class="space-y-1.5 md:space-y-2">
        <label class="block text-[10px] md:text-xs text-gray-600 font-semibold uppercase tracking-wider">
          Notes
        </label>
        <textarea
          v-model="currentClient.notes"
          placeholder="Commentaires, préférences..."
          rows="2"
          class="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 hover:border-gray-400 transition-all resize-none"
        ></textarea>
      </div>
    </div>

    <!-- Actions -->
    <div class="p-4 md:p-6 border-t border-gray-200 bg-white">
      <div class="grid grid-cols-3 gap-2 md:gap-3">
        <button
          @click="handleShowHistory"
          :disabled="!isEditMode"
          class="btn-secondary text-[10px] md:text-xs px-2 md:px-4 py-2.5 md:py-3"
        >
          <History class="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span class="hidden sm:inline">Historique</span>
        </button>
        
        <button
          @click="handleClear"
          :disabled="!hasClientInfo"
          :class="[
            'inline-flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-2.5 md:py-3 text-[10px] md:text-xs font-medium rounded-xl transition-all duration-200',
            hasClientInfo
              ? 'bg-white border border-gray-300 text-red-600 hover:bg-red-50 hover:border-red-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          ]"
        >
          <Trash2 class="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span class="hidden sm:inline">Effacer</span>
        </button>
        
        <button
          @click="handleSave"
          :disabled="!hasClientInfo"
          :class="[
            'btn-primary text-[10px] md:text-xs px-2 md:px-4 py-2.5 md:py-3',
            isEditMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
          ]"
        >
          <component :is="isEditMode ? Save : UserPlus" class="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span class="hidden sm:inline">{{ isEditMode ? 'Modifier' : 'Créer' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
