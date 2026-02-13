<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, Save, Trash2, History, MapPin, UserPlus, UserPen } from 'lucide-vue-next';
import { useClient } from '../composables/useClient';
import { useClients } from '../composables/useClients';
import { formatPhoneFR, formatPostalCode, INPUT_LENGTHS } from '../utils/formatInputs';
import type { Client } from '../types';
import type { Client as DBClient } from '../types/database';

// Composables
const { currentClient, isEditMode, clearClient, loadClient, hasClientInfo, saveClient } = useClient();
const { searchClients, selectClient: setSelectedClient, clearSelection, selectedClient: selectedClientGlobal, invoiceInCompanyName, setInvoiceInCompanyName } = useClients();

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
  setInvoiceInCompanyName(false);
  // Convertir du format BDD (snake_case) vers le format formulaire (camelCase)
  const client: Client = {
    id: dbClient.id,
    firstName: dbClient.first_name,
    lastName: dbClient.last_name,
    phone: formatPhoneFR(dbClient.phone || ''),
    phone2: formatPhoneFR(dbClient.phone2 || ''),
    email: dbClient.email || '',
    address: dbClient.address || '',
    city: dbClient.city || '',
    postalCode: formatPostalCode(dbClient.postal_code || ''),
    birthDate: dbClient.birth_date || '',
    notes: dbClient.notes || '',
    company: dbClient.company || '',
  };
  // Charger toutes les données du client dans le formulaire
  loadClient(client);
  searchQuery.value = `${client.firstName} ${client.lastName}`;
  // Fermer la liste de recherche
  clientSearchResults.value = [];
};

// Sélectionner le premier client avec Entrée
const handleClientSearchKeydown = (event: KeyboardEvent): void => {
  const first = clientSearchResults.value[0];
  if (event.key === 'Enter' && first) {
    event.preventDefault();
    selectClient(first);
  }
};

// Labels des champs
const formFields = [
  { key: 'lastName', label: 'Nom', type: 'text', placeholder: 'Dupont', span: 1, format: null as 'phone' | null },
  { key: 'firstName', label: 'Prénom', type: 'text', placeholder: 'Jean', span: 1, format: null as 'phone' | null },
  { key: 'phone', label: 'Tél. 1', type: 'tel', placeholder: '06 12 34 56 78', span: 1, format: 'phone' as const },
  { key: 'phone2', label: 'Tél. 2', type: 'tel', placeholder: '01 23 45 67 89', span: 1, format: 'phone' as const },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'jean@email.com', span: 2, format: null as 'phone' | null },
  { key: 'birthDate', label: 'Anniversaire', type: 'date', placeholder: '', span: 2, format: null as 'phone' | null },
  { key: 'company', label: 'Entreprise', type: 'text', placeholder: 'Nom de l\'entreprise (optionnel)', span: 2, format: null as 'phone' | null },
] as const;

function onFieldInput(key: keyof Client, value: string, format: 'phone' | null): void {
  const formatted = format === 'phone' ? formatPhoneFR(value) : value;
  (currentClient as unknown as Record<string, string>)[key] = formatted;
}

</script>

<template>
  <div class="card h-full flex flex-col overflow-hidden">
    <!-- En-tête avec recherche -->
    <div class="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div class="flex items-center justify-between mb-3 md:mb-4">
        <h2 class="text-xs md:text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Client</h2>
        <!-- Badge mode création/modification -->
        <div 
          v-if="hasClientInfo"
          :class="[
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold transition-colors',
            isEditMode 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          ]"
        >
          <component :is="isEditMode ? UserPen : UserPlus" class="w-3 h-3" />
          <span>{{ isEditMode ? 'Modification' : 'Nouveau' }}</span>
        </div>
      </div>
      <div class="relative">
        <Search class="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
        <input
          v-model="searchQuery"
          @keydown="handleClientSearchKeydown"
          type="text"
          placeholder="Rechercher un client..."
          class="w-full pl-11 md:pl-14 pr-4 md:pr-5 py-3 md:py-3.5 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30 hover:border-gray-400 transition-all"
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
            class="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-700 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 py-2 z-50"
          >
            <button
              v-for="client in clientSearchResults"
              :key="client.id"
              @click="selectClient(client)"
              class="w-full px-4 md:px-5 py-2.5 md:py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <p class="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-100">{{ client.first_name }} {{ client.last_name }}</p>
              <p class="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ client.phone }}</p>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Formulaire client -->
    <div class="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 space-y-4 md:space-y-5 bg-gray-50 dark:bg-gray-800">
      <!-- Champs du formulaire -->
      <div class="grid grid-cols-2 gap-3 md:gap-4">
        <div
          v-for="field in formFields.filter(f => f.span !== 2)"
          :key="field.key"
          class="space-y-1.5 md:space-y-2"
        >
          <label class="block text-[10px] md:text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider">
            {{ field.label }}
          </label>
          <input
            :value="(currentClient as any)[field.key]"
            :type="field.type"
            :placeholder="field.placeholder"
            :maxlength="field.format === 'phone' ? INPUT_LENGTHS.phone : undefined"
            :inputmode="field.format === 'phone' ? 'numeric' : undefined"
            :autocomplete="field.format === 'phone' ? 'tel' : undefined"
            class="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30 hover:border-gray-400 transition-all"
            @input="onFieldInput(field.key, ($event.target as HTMLInputElement).value, field.format)"
          />
        </div>
        
        <!-- Champs pleine largeur -->
        <template v-for="field in formFields.filter(f => f.span === 2)" :key="field.key">
          <div class="col-span-2 space-y-1.5 md:space-y-2">
            <label class="block text-[10px] md:text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider">
              {{ field.label }}
            </label>
            <input
              :value="(currentClient as any)[field.key]"
              :type="field.type"
              :placeholder="field.placeholder"
              class="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30 hover:border-gray-400 transition-all"
              @input="field.format ? onFieldInput(field.key, ($event.target as HTMLInputElement).value, field.format) : ((currentClient as any)[field.key] = ($event.target as HTMLInputElement).value)"
            />
          </div>
        </template>
      </div>

      <!-- Facture au nom de l'entreprise -->
      <div v-if="selectedClientGlobal" class="col-span-2 flex items-center gap-3 p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
        <input
          :id="'cb-invoice-company'"
          type="checkbox"
          :checked="invoiceInCompanyName"
          @change="setInvoiceInCompanyName((($event.target as HTMLInputElement).checked))"
          class="w-4 h-4 rounded border-gray-300 dark:border-gray-500 text-gray-900 dark:bg-gray-600 focus:ring-gray-900 dark:focus:ring-emerald-500"
        />
        <label for="cb-invoice-company" class="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
          Facture au nom de l'entreprise
        </label>
      </div>

      <!-- Adresse -->
      <div class="col-span-2 space-y-1.5 md:space-y-2">
        <label class="block text-[10px] md:text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 md:gap-2">
          <MapPin class="w-3 h-3 md:w-3.5 md:h-3.5" />
          <span>Adresse</span>
        </label>
        <input
          v-model="currentClient.address"
          type="text"
          placeholder="123 Rue de la Paix"
          class="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30 hover:border-gray-400 transition-all"
        />
      </div>

      <!-- Ville et Code postal -->
      <div class="grid grid-cols-2 gap-3 md:gap-4">
        <div class="space-y-1.5 md:space-y-2">
          <label class="block text-[10px] md:text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider">
            Ville
          </label>
          <input
            v-model="currentClient.city"
            type="text"
            placeholder="Paris"
            class="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30 hover:border-gray-400 transition-all"
          />
        </div>
        <div class="space-y-1.5 md:space-y-2">
          <label class="block text-[10px] md:text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider">
            CP
          </label>
          <input
            :value="currentClient.postalCode"
            type="text"
            inputmode="numeric"
            :maxlength="INPUT_LENGTHS.postalCode"
            placeholder="75001"
            class="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30 hover:border-gray-400 transition-all"
            @input="currentClient.postalCode = formatPostalCode(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <!-- Notes / Commentaire -->
      <div class="space-y-1.5 md:space-y-2">
        <label class="block text-[10px] md:text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider">
          Notes
        </label>
        <textarea
          v-model="currentClient.notes"
          placeholder="Commentaires, préférences..."
          rows="2"
          class="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 border border-gray-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30 hover:border-gray-400 transition-all resize-none"
        ></textarea>
      </div>
    </div>

    <!-- Actions -->
    <div class="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
              ? 'bg-white border border-gray-300 text-red-600 hover:bg-red-50 hover:border-red-200 dark:bg-gray-700 dark:border-gray-600 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:border-red-800'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-500'
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
            isEditMode ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500'
          ]"
        >
          <component :is="isEditMode ? Save : UserPlus" class="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span class="hidden sm:inline">{{ isEditMode ? 'Modifier' : 'Créer' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
