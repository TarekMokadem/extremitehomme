<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, Zap, Barcode } from 'lucide-vue-next';
import ServiceCard from './ServiceCard.vue';
import LoyaltyCard from './LoyaltyCard.vue';
import { useProducts } from '../composables/useProducts';
import { useSales } from '../composables/useSales';
import { useClients } from '../composables/useClients';
import { useLoyalty } from '../composables/useLoyalty';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Product, Vendor } from '../types/database';

// Composables
const { products, isLoading, searchProducts, findByBarcode } = useProducts();
const { addToCart } = useSales();
const { selectedClient } = useClients();
const { loadClientStamps, clearStamps } = useLoyalty();

// Liste des vendeurs (chargée au démarrage)
const vendors = ref<Vendor[]>([]);
const loadVendors = async () => {
  if (!isSupabaseConfigured()) return;
  const { data } = await supabase.from('vendors').select('*').eq('is_active', true);
  vendors.value = data || [];
};
loadVendors();

// Charger la carte de fidélité quand un client est sélectionné
watch(selectedClient, (newClient) => {
  if (newClient) {
    loadClientStamps(newClient.id);
  } else {
    clearStamps();
  }
});

// State
const searchQuery = ref<string>('');
const showAutocomplete = ref<boolean>(false);
const autocompleteResults = ref<Product[]>([]);
const shortcutCode = ref<string>('');
const shortcutError = ref<string>('');
const barcodeInput = ref<string>('');
const barcodeError = ref<string>('');

// Services affichés : is_active = true, type = service, tri par code croissant
const displayedServices = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  const servicesOnly = products.value
    .filter(p => p.type === 'service' && p.is_active !== false)
    .slice()
    .sort((a, b) => String(a.code ?? '').localeCompare(String(b.code ?? ''), undefined, { numeric: true }));

  if (!query) return servicesOnly;

  return servicesOnly.filter(product =>
    product.name.toLowerCase().includes(query) ||
    product.code?.toLowerCase().includes(query)
  );
});

// Log du nombre de services affichés
watch(displayedServices, (list) => {
  console.log('Services affichés:', list.length);
}, { immediate: true });

// Handlers
const handleSearchInput = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement;
  searchQuery.value = target.value;
  
  if (target.value.trim().length >= 2) {
    // Rechercher les produits
    const results = await searchProducts(target.value);
    // Ne proposer que les services dans les suggestions
    autocompleteResults.value = (results || []).filter(p => p.type === 'service');
    showAutocomplete.value = autocompleteResults.value.length > 0;
  } else {
    autocompleteResults.value = [];
    showAutocomplete.value = false;
  }
};

const handleSearchFocus = (): void => {
  if (searchQuery.value.trim().length >= 2 && autocompleteResults.value.length > 0) {
    showAutocomplete.value = true;
  }
};

const handleSearchBlur = (): void => {
  setTimeout(() => {
    showAutocomplete.value = false;
  }, 200);
};

const selectService = (product: Product): void => {
  searchQuery.value = product.name;
  showAutocomplete.value = false;
};

// Sélectionner la première suggestion avec Entrée et l'ajouter au panier
const handleSearchKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Enter' && autocompleteResults.value.length > 0) {
    event.preventDefault();
    const firstResult = autocompleteResults.value[0];
    addToCart(firstResult);
    searchQuery.value = '';
    autocompleteResults.value = [];
    showAutocomplete.value = false;
  }
};

// Scan code-barres : ajouter le produit au panier (produits physiques)
const handleBarcodeSubmit = async (): Promise<void> => {
  const code = barcodeInput.value.trim();
  if (!code) return;
  barcodeError.value = '';
  const product = await findByBarcode(code);
  if (product) {
    addToCart(product, 1);
    barcodeInput.value = '';
  } else {
    barcodeError.value = 'Produit non trouvé ou sans code-barres';
    setTimeout(() => { barcodeError.value = ''; }, 3000);
  }
};

watch(searchQuery, (newVal) => {
  if (newVal.trim().length < 2) {
    autocompleteResults.value = [];
    showAutocomplete.value = false;
  }
});

// =====================================================
// RACCOURCI (ex: VL1 = Valentin Laine + Coupe Homme)
// =====================================================

// Parser le code raccourci : "VL1" → { vendorInitials: "VL", productCode: "1" }
const parseShortcutCode = (code: string): { vendorInitials: string; productCode: string } | null => {
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length < 2) return null;
  
  // Chercher où se termine les lettres et où commence le code produit
  // Ex: VL1, TN2, VL10, TN123
  const match = trimmed.match(/^([A-Z]+)(\d+.*)$/);
  if (!match) return null;
  
  return {
    vendorInitials: match[1],
    productCode: match[2],
  };
};

// Trouver le vendeur par ses initiales
const findVendorByInitials = (initials: string): Vendor | undefined => {
  return vendors.value.find(v => 
    v.initials?.toUpperCase() === initials.toUpperCase()
  );
};

// Trouver le produit par son code
const findProductByCode = (code: string): Product | undefined => {
  return products.value.find(p => 
    p.code?.toUpperCase() === code.toUpperCase()
  );
};

// Valider le raccourci avec Entrée
const handleShortcutKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Enter') {
    event.preventDefault();
    processShortcut();
  }
};

const processShortcut = (): void => {
  shortcutError.value = '';
  
  const parsed = parseShortcutCode(shortcutCode.value);
  if (!parsed) {
    shortcutError.value = 'Format invalide (ex: VL1)';
    return;
  }
  
  const vendor = findVendorByInitials(parsed.vendorInitials);
  if (!vendor) {
    shortcutError.value = `Vendeur "${parsed.vendorInitials}" non trouvé`;
    return;
  }
  
  const product = findProductByCode(parsed.productCode);
  if (!product) {
    shortcutError.value = `Service "${parsed.productCode}" non trouvé`;
    return;
  }
  
  // Ajouter au panier avec le bon vendeur
  addToCart(product, 1, vendor);
  
  // Réinitialiser le champ
  shortcutCode.value = '';
  shortcutError.value = '';
};
</script>

<template>
  <div class="card flex flex-col bg-white dark:bg-gray-800 h-full">
    <!-- Barre de recherche + Raccourci -->
    <div class="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
      <!-- Champ Raccourci -->
      <div class="relative">
        <div class="flex items-center gap-3">
          <div class="relative flex-1">
            <Zap class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 dark:text-amber-400 pointer-events-none z-10" />
            <input
              v-model="shortcutCode"
              @keydown="handleShortcutKeydown"
              type="text"
              placeholder="Raccourci (ex: VL1)"
              class="w-full pl-11 pr-4 py-2.5 bg-amber-50 dark:bg-gray-700 dark:border-amber-600/50 dark:text-gray-100 border border-amber-300 rounded-xl text-sm font-mono font-semibold uppercase focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:focus:border-amber-400 dark:focus:ring-amber-400/30 hover:border-amber-400 transition-all placeholder:normal-case placeholder:font-normal dark:placeholder-gray-400"
              autocomplete="off"
            />
          </div>
          <button
            @click="processShortcut"
            class="px-4 py-2.5 bg-amber-500 dark:bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-600 dark:hover:bg-amber-500 transition-colors text-sm"
          >
            OK
          </button>
        </div>
        <p v-if="shortcutError" class="text-xs text-red-500 dark:text-red-400 mt-1.5">{{ shortcutError }}</p>
      </div>

      <!-- Scan code-barres (pour vendre un produit) -->
      <div class="space-y-1">
        <label class="block text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Scan code-barres</label>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <Barcode class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              v-model="barcodeInput"
              type="text"
              placeholder="Scannez le code-barres du produit..."
              class="w-full pl-10 pr-4 py-2.5 md:py-3 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 border border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30"
              autocomplete="off"
              @keydown.enter.prevent="handleBarcodeSubmit"
            />
          </div>
          <button
            type="button"
            @click="handleBarcodeSubmit"
            class="px-4 py-2.5 bg-gray-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-gray-800"
          >
            Ajouter
          </button>
        </div>
        <p v-if="barcodeError" class="text-xs text-red-600 dark:text-red-400">{{ barcodeError }}</p>
      </div>

      <!-- Barre de recherche -->
      <div class="relative">
        <div class="relative">
          <Search class="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
          <input
            :value="searchQuery"
            @input="handleSearchInput"
            @focus="handleSearchFocus"
            @blur="handleSearchBlur"
            @keydown="handleSearchKeydown"
            type="text"
            placeholder="Rechercher un service..."
            class="w-full pl-11 md:pl-14 pr-4 md:pr-5 py-3 md:py-3.5 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 border border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30 hover:border-gray-400 transition-all"
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
            class="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-700 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 py-2 z-50 max-h-60 md:max-h-80 overflow-y-auto"
          >
            <button
              v-for="product in autocompleteResults"
              :key="product.id"
              @click="selectService(product)"
              class="w-full px-4 md:px-5 py-2.5 md:py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-between"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ product.name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ product.code }}</p>
              </div>
              <div class="flex items-center gap-2 md:gap-3 ml-2 md:ml-3">
                <span class="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">{{ product.price_ttc?.toFixed(2) }}€</span>
                <span v-if="product.duration" class="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">{{ product.duration }}min</span>
              </div>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Grille de services -->
    <div class="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-800 space-y-4">
      <!-- Grille de services -->
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
        class="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-12"
      >
        <Search class="w-10 h-10 md:w-14 md:h-14 mb-4 opacity-40" />
        <p class="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400">Aucun service trouvé</p>
        <p class="text-xs md:text-sm text-gray-400 dark:text-gray-500 mt-1.5">Modifiez votre recherche</p>
      </div>

      <!-- Carte de fidélité (si client sélectionné) — sous la liste des services -->
      <LoyaltyCard v-if="selectedClient" />
    </div>
  </div>
</template>
