<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search } from 'lucide-vue-next';
import { services } from '../data/services';
import type { Service } from '../types';
import ServiceCard from './ServiceCard.vue';

// State
const searchQuery = ref<string>('');
const showAutocomplete = ref<boolean>(false);

// Services pour l'autocomplétion
const autocompleteResults = computed((): Service[] => {
  const query = searchQuery.value.toLowerCase().trim();
  if (query.length < 2) return [];
  
  return services
    .filter(service => service.name.toLowerCase().includes(query))
    .slice(0, 8);
});

// Services affichés dans la grille
const displayedServices = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return services;

  return services.filter(service =>
    service.name.toLowerCase().includes(query)
  );
});

// Handlers
const handleSearchInput = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  searchQuery.value = target.value;
  showAutocomplete.value = target.value.trim().length >= 2;
};

const handleSearchFocus = (): void => {
  if (searchQuery.value.trim().length >= 2) {
    showAutocomplete.value = true;
  }
};

const handleSearchBlur = (): void => {
  setTimeout(() => {
    showAutocomplete.value = false;
  }, 200);
};

const selectService = (service: Service): void => {
  searchQuery.value = service.name;
  showAutocomplete.value = false;
};

watch(searchQuery, (newVal) => {
  if (newVal.trim().length < 2) {
    showAutocomplete.value = false;
  }
});
</script>

<template>
  <div class="card flex flex-col bg-white h-full">
    <!-- Barre de recherche -->
    <div class="p-4 md:p-6 border-b border-gray-200 bg-white">
      <div class="relative">
        <div class="relative">
          <Search class="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400 pointer-events-none z-10" />
          <input
            :value="searchQuery"
            @input="handleSearchInput"
            @focus="handleSearchFocus"
            @blur="handleSearchBlur"
            type="text"
            placeholder="Rechercher un service..."
            class="w-full pl-11 md:pl-14 pr-4 md:pr-5 py-3 md:py-3.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 hover:border-gray-400 transition-all"
            autocomplete="off"
          />
        </div>

        <!-- Résultats d'autocomplétion -->
        <Transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <div
            v-if="showAutocomplete && autocompleteResults.length > 0"
            class="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 max-h-60 md:max-h-80 overflow-y-auto"
          >
            <button
              v-for="service in autocompleteResults"
              :key="service.id"
              @click="selectService(service)"
              class="w-full px-4 md:px-5 py-2.5 md:py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ service.name }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ service.category }}</p>
              </div>
              <div class="flex items-center gap-2 md:gap-3 ml-2 md:ml-3">
                <span class="text-sm font-bold text-gray-900 tabular-nums">{{ service.price }}€</span>
                <span v-if="service.duration" class="text-xs text-gray-400 hidden sm:inline">{{ service.duration }}min</span>
              </div>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Grille de services -->
    <div class="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div 
        v-if="displayedServices.length > 0"
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 md:gap-3.5"
      >
        <ServiceCard
          v-for="service in displayedServices"
          :key="service.id"
          :service="service"
        />
      </div>

      <!-- État vide -->
      <div 
        v-else
        class="h-full flex flex-col items-center justify-center text-gray-400 py-12"
      >
        <Search class="w-10 h-10 md:w-14 md:h-14 mb-4 opacity-40" />
        <p class="text-sm md:text-base font-medium text-gray-500">Aucun service trouvé</p>
        <p class="text-xs md:text-sm text-gray-400 mt-1.5">Modifiez votre recherche</p>
      </div>
    </div>
  </div>
</template>
