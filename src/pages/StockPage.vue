<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import {
  Package,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  AlertTriangle,
  History,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-vue-next';
import { useStock } from '../composables/useStock';
import { useAuth } from '../composables/useAuth';
import type { Product, StockCategory } from '../types/database';
import type { StockMovementType } from '../types/database';

const {
  productsWithStock,
  lowStockList,
  categories,
  movements,
  loadProducts,
  loadCategories,
  loadMovements,
  addMovement,
  createProduct,
  updateProduct,
  updateAlertThreshold,
  updateBarcode,
  isLoading,
  isSaving,
} = useStock();

const { vendor: currentVendor } = useAuth();

// Onglet principal : Produits ou Historique global
const stockTab = ref<'products' | 'history'>('products');

// Filtre liste (uniquement des produits, pas de services)
const filter = ref<'all' | 'alert'>('all');
const displayedProducts = computed(() => {
  if (filter.value === 'alert') return lowStockList.value;
  return productsWithStock.value;
});

// Recherche (nom, code, code-barres, marque, modèle)
const searchQuery = ref('');
const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return displayedProducts.value;
  return displayedProducts.value.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.model && p.model.toLowerCase().includes(q))
  );
});

// Pagination (comme Clients / Historique)
const pageSize = ref(25);
const pageSizeOptions = [25, 50, 100];
const currentPage = ref(1);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredProducts.value.length / pageSize.value))
);
const paginationInfo = computed(() => {
  const total = filteredProducts.value.length;
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
const paginatedProducts = computed(() => {
  const from = (currentPage.value - 1) * pageSize.value;
  return filteredProducts.value.slice(from, from + pageSize.value);
});
const goToPage = (p: number) => {
  currentPage.value = Math.max(1, Math.min(p, totalPages.value));
};
const pageInputValue = ref('');
const syncPageInput = () => {
  pageInputValue.value = String(currentPage.value);
};
const onPageInputSubmit = () => {
  const num = parseInt(pageInputValue.value, 10);
  if (!isNaN(num) && num >= 1) goToPage(num);
  syncPageInput();
};
watch(currentPage, () => syncPageInput(), { immediate: true });
watch([filter, searchQuery], () => {
  currentPage.value = 1;
});

// Modal mouvement
const showMovementModal = ref(false);
const movementProduct = ref<Product | null>(null);
const movementType = ref<StockMovementType>('in');
const movementQuantity = ref<number>(1);
const movementReason = ref('');
const movementStockType = ref<StockCategory>('sale');

// Stock actuel du produit selon le type de stock sélectionné
const currentStockForMovement = computed(() => {
  if (!movementProduct.value) return 0;
  return movementStockType.value === 'technical'
    ? (movementProduct.value.stock_technical ?? 0)
    : movementProduct.value.stock;
});

function openMovementModal(product: Product) {
  movementProduct.value = product;
  movementType.value = 'in';
  movementQuantity.value = 1;
  movementReason.value = '';
  movementStockType.value = 'sale';
  showMovementModal.value = true;
}

function closeMovementModal() {
  showMovementModal.value = false;
  movementProduct.value = null;
}

async function submitMovement() {
  if (!movementProduct.value) return;
  const qty = movementQuantity.value;
  if (movementType.value === 'adjustment' && qty < 0) return;
  if (qty <= 0 && movementType.value !== 'adjustment') return;

  try {
    const defaultReason = movementType.value === 'in'
      ? 'Entrée stock'
      : movementType.value === 'out'
        ? 'Sortie stock'
        : `Ajustement → ${qty}`;
    await addMovement({
      product_id: movementProduct.value.id,
      type: movementType.value,
      quantity: movementQuantity.value,
      reason: movementReason.value || defaultReason,
      vendor_id: currentVendor.value?.id ?? null,
      stock_type: movementStockType.value,
    });
    closeMovementModal();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement');
  }
}

// Modal historique mouvements
const showHistoryModal = ref(false);
const historyProduct = ref<Product | null>(null);

function openHistory(product: Product) {
  historyProduct.value = product;
  showHistoryModal.value = true;
  loadMovements(product.id);
}

function openGlobalHistory() {
  stockTab.value = 'history';
  loadMovements();
}

function closeHistory() {
  showHistoryModal.value = false;
  historyProduct.value = null;
}

// Édition seuil alerte
const editingThreshold = ref<string | null>(null);
const thresholdValue = ref(0);

function startEditThreshold(product: Product) {
  editingThreshold.value = product.id;
  thresholdValue.value = product.alert_threshold;
}

// Édition code-barres
const editingBarcode = ref<string | null>(null);
const barcodeValue = ref('');

function startEditBarcode(product: Product) {
  editingBarcode.value = product.id;
  barcodeValue.value = product.barcode || '';
}

function cancelEditBarcode() {
  editingBarcode.value = null;
}

async function saveBarcode() {
  if (!editingBarcode.value) return;
  try {
    await updateBarcode(editingBarcode.value, barcodeValue.value || null);
    editingBarcode.value = null;
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Erreur');
  }
}

function cancelEditThreshold() {
  editingThreshold.value = null;
}

async function saveThreshold() {
  if (!editingThreshold.value) return;
  try {
    await updateAlertThreshold(editingThreshold.value, thresholdValue.value);
    editingThreshold.value = null;
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Erreur');
  }
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const getProductName = (productId: string) =>
  productsWithStock.value.find((p) => p.id === productId)?.name ?? 'Produit inconnu';

const movementLabel = (type: string, quantity: number) => {
  const q = Math.abs(quantity);
  if (type === 'in') return `+${q}`;
  if (type === 'out') return `-${q}`;
  return quantity >= 0 ? `+${quantity}` : `${quantity}`;
};

const stockTypeLabel = (st: string) => st === 'technical' ? 'Technique' : 'Vente';

// Grilles de taille par catégorie (slug)
const SHOE_CATEGORY_SLUGS = ['chaussures', 'boots', 'bottines', 'mocassins', 'souliers', 'tennis', 'baskets'];
const FRENCH_SIZES = [36, 36.5, 37, 37.5, 38, 38.5, 39, 39.5, 40, 40.5, 41, 41.5, 42, 42.5, 43, 43.5, 44, 44.5, 45, 45.5, 46, 46.5, 47];
const ENGLISH_SIZES: { fr: number; uk: number }[] = [
  { fr: 36, uk: 3 }, { fr: 37, uk: 4 }, { fr: 38, uk: 5 }, { fr: 39, uk: 6 }, { fr: 40, uk: 6.5 }, { fr: 40.5, uk: 7 },
  { fr: 41, uk: 7.5 }, { fr: 42, uk: 8 }, { fr: 42.5, uk: 8.5 }, { fr: 43, uk: 9 }, { fr: 43.5, uk: 9.5 }, { fr: 44, uk: 10 }, { fr: 45, uk: 10.5 },
  { fr: 45.5, uk: 11 }, { fr: 46, uk: 11.5 }, { fr: 47, uk: 12 },
];
const BELT_SIZES = [90, 95, 100, 105, 110, 115, 120, 125, 130];
const selectedCategorySlug = computed(() => {
  const id = showAddProductModal.value ? newProduct.value.category_id : editForm.value.category_id;
  return categories.value.find(c => c.id === id)?.slug || '';
});
const showShoeSizeChoice = computed(() => SHOE_CATEGORY_SLUGS.includes(selectedCategorySlug.value));
const shoeSizeType = ref<'fr' | 'uk'>('fr');
const selectedSize = ref<string | null>(null);
const sizeGridForCategory = computed(() => {
  const slug = selectedCategorySlug.value;
  if (SHOE_CATEGORY_SLUGS.includes(slug)) {
    return shoeSizeType.value === 'fr'
      ? FRENCH_SIZES.map(s => String(s))
      : ENGLISH_SIZES.map(s => `${s.fr} (${s.uk} UK)`);
  }
  if (slug === 'ceintures') return BELT_SIZES.map(s => String(s));
  if (slug && !['echarpes', 'chaussettes', 'ceintures-tressees'].includes(slug)) return ['TU'];
  return [];
});

// Modal ajout produit
const showAddProductModal = ref(false);
const newProduct = ref({
  name: '',
  code: '',
  barcode: '',
  category_id: '',
  brand: '',
  model: '',
  price_ht: 0,
  price_ttc: 0,
  tva_rate: 0.2,
  stock: 0,
  stock_technical: 0,
  alert_threshold: 5,
});

const barcodeInputRef = ref<HTMLInputElement | null>(null);

function openAddProductModal() {
  newProduct.value = {
    name: '',
    code: '',
    barcode: '',
    category_id: '',
    brand: '',
    model: '',
    price_ht: 0,
    price_ttc: 0,
    tva_rate: 0.2,
    stock: 0,
    stock_technical: 0,
    alert_threshold: 5,
  };
  selectedSize.value = null;
  shoeSizeType.value = 'fr';
  showAddProductModal.value = true;
  loadCategories();
  nextTick(() => barcodeInputRef.value?.focus());
}

function closeAddProductModal() {
  showAddProductModal.value = false;
}

// Coef calculé côté front : Prix de vente / Prix HT
const newProductCoef = computed({
  get: () => {
    const ht = Number(newProduct.value.price_ht) || 0;
    const ttc = Number(newProduct.value.price_ttc) || 0;
    return ht > 0 ? ttc / ht : 1.2;
  },
  set: (v: number) => {
    const ht = Number(newProduct.value.price_ht) || 0;
    newProduct.value.price_ttc = ht > 0 ? ht * v : 0;
  },
});
const editFormCoef = computed({
  get: () => {
    const ht = Number(editForm.value.price_ht) || 0;
    const ttc = Number(editForm.value.price_ttc) || 0;
    return ht > 0 ? ttc / ht : 1.2;
  },
  set: (v: number) => {
    const ht = Number(editForm.value.price_ht) || 0;
    editForm.value.price_ttc = ht > 0 ? ht * v : 0;
  },
});

function selectSize(size: string) {
  selectedSize.value = selectedSize.value === size ? null : size;
}

async function submitAddProduct() {
  if (!newProduct.value.name.trim()) {
    alert('Nom du produit requis.');
    return;
  }
  try {
    await createProduct({
      name: newProduct.value.name.trim(),
      code: newProduct.value.code.trim() || null,
      barcode: newProduct.value.barcode.trim() || null,
      category_id: newProduct.value.category_id || null,
      brand: newProduct.value.brand.trim() || null,
      model: newProduct.value.model.trim() || null,
      price_ht: Number(newProduct.value.price_ht) || 0,
      price_ttc: Number(newProduct.value.price_ttc) || 0,
      tva_rate: 0.2,
      size: selectedSize.value || null,
      stock: Math.max(0, Number(newProduct.value.stock) || 0),
      stock_technical: Math.max(0, Number(newProduct.value.stock_technical) || 0),
      alert_threshold: Math.max(0, Number(newProduct.value.alert_threshold) || 5),
    });
    closeAddProductModal();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement');
  }
}

// Modal édition produit
const showEditProductModal = ref(false);
const editProduct = ref<Product | null>(null);
const editForm = ref({
  name: '',
  code: '',
  barcode: '',
  category_id: '',
  brand: '',
  model: '',
  price_ht: 0,
  price_ttc: 0,
  tva_rate: 0.2,
  alert_threshold: 5,
});
const editBarcodeInputRef = ref<HTMLInputElement | null>(null);

function openEditProductModal(product: Product) {
  editProduct.value = product;
  const priceTtc = product.price_ttc ?? product.price_ht * (1 + (product.tva_rate ?? 0.2));
  editForm.value = {
    name: product.name,
    code: product.code || '',
    barcode: product.barcode || '',
    category_id: product.category_id || '',
    brand: product.brand || '',
    model: product.model || '',
    price_ht: product.price_ht,
    price_ttc: priceTtc,
    tva_rate: product.tva_rate ?? 0.2,
    alert_threshold: product.alert_threshold ?? 5,
  };
  selectedSize.value = (product as Product & { size?: string | null }).size ?? null;
  shoeSizeType.value = 'fr';
  showEditProductModal.value = true;
  loadCategories();
  nextTick(() => editBarcodeInputRef.value?.focus());
}

function closeEditProductModal() {
  showEditProductModal.value = false;
  editProduct.value = null;
}

async function submitEditProduct() {
  if (!editProduct.value || !editForm.value.name.trim()) return;
  try {
    await updateProduct(editProduct.value.id, {
      name: editForm.value.name.trim(),
      code: editForm.value.code.trim() || null,
      barcode: editForm.value.barcode.trim() || null,
      category_id: editForm.value.category_id || null,
      brand: editForm.value.brand.trim() || null,
      model: editForm.value.model.trim() || null,
      price_ht: Number(editForm.value.price_ht) || 0,
      price_ttc: Number(editForm.value.price_ttc) || 0,
      tva_rate: 0.2,
      size: selectedSize.value || null,
      alert_threshold: Math.max(0, Number(editForm.value.alert_threshold) || 5),
    });
    closeEditProductModal();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Erreur lors de la mise à jour');
  }
}

watch(stockTab, (tab) => {
  if (tab === 'history') loadMovements();
});

onMounted(() => {
  loadProducts();
  if (stockTab.value === 'history') loadMovements();
});
</script>

<template>
  <main class="flex-1 px-3 py-4 lg:px-4 lg:py-6 overflow-auto bg-gray-50 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto space-y-6">
      <!-- En-tête -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package class="w-7 h-7 text-gray-600 dark:text-gray-400" />
            Gestion du stock
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Produits, mouvements et alertes</p>
        </div>
        <button
          @click="loadProducts(); loadMovements()"
          :disabled="isLoading"
          class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw :class="['w-4 h-4', isLoading && 'animate-spin']" />
          Actualiser
        </button>
      </div>

      <!-- Onglets Produits / Historique global -->
      <div class="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800">
        <button
          @click="stockTab = 'products'"
          :class="[
            'flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2',
            stockTab === 'products'
              ? 'bg-gray-900 dark:bg-emerald-600 text-white'
              : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          ]"
        >
          <Package class="w-4 h-4" />
          Produits
        </button>
        <button
          @click="openGlobalHistory"
          :class="[
            'flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2',
            stockTab === 'history'
              ? 'bg-gray-900 dark:bg-emerald-600 text-white'
              : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          ]"
        >
          <History class="w-4 h-4" />
          Historique global
        </button>
      </div>

      <!-- Filtres + recherche (onglet Produits uniquement) -->
      <div v-if="stockTab === 'products'" class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
            <button
              v-for="opt in [
                { id: 'all', label: 'Tous' },
                { id: 'alert', label: 'Alerte stock' },
              ]"
              :key="opt.id"
              @click="filter = opt.id as typeof filter"
              :class="[
                'px-4 py-2 text-sm font-medium transition-colors',
                filter === opt.id
                  ? 'bg-gray-900 dark:bg-emerald-600 text-white'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              ]"
            >
              {{ opt.label }}
            </button>
          </div>
          <button
            @click="openAddProductModal"
            class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-500"
          >
            <Plus class="w-4 h-4" />
            Ajouter un produit
          </button>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher un produit..."
            class="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading && (stockTab === 'products' ? productsWithStock.length === 0 : true)" class="flex justify-center py-20">
        <RefreshCw class="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin" />
      </div>

      <!-- Historique global des mouvements -->
      <div v-else-if="stockTab === 'history'" class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Tous les mouvements de stock</h3>
          <button
            @click="loadMovements()"
            :disabled="isLoading"
            class="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw :class="['w-4 h-4', isLoading && 'animate-spin']" />
            Actualiser
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th class="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th class="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Produit</th>
                <th class="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Stock</th>
                <th class="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th class="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Quantité</th>
                <th class="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Motif</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr
                v-for="m in movements"
                :key="m.id"
                class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{{ formatDate(m.created_at) }}</td>
                <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                  {{ getProductName(m.product_id) }}
                </td>
                <td class="px-4 py-3">
                  <span :class="['inline-flex px-2 py-0.5 rounded text-xs font-medium', m.stock_type === 'technical' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300']">
                    {{ stockTypeLabel(m.stock_type) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
                      m.type === 'in' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : m.type === 'out' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    ]"
                  >
                    <ArrowDownCircle v-if="m.type === 'in'" class="w-3.5 h-3.5" />
                    <ArrowUpCircle v-else-if="m.type === 'out'" class="w-3.5 h-3.5" />
                    <RefreshCw v-else class="w-3.5 h-3.5" />
                    {{ m.type === 'in' ? 'Entrée' : m.type === 'out' ? 'Sortie' : 'Ajustement' }}
                  </span>
                </td>
                <td class="px-4 py-3 font-semibold" :class="m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                  {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{{ m.reason || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="movements.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
          Aucun mouvement enregistré.
        </p>
      </div>

      <!-- Tableau produits : 100% largeur, pas de scroll horizontal sur PC -->
      <div v-else class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="overflow-x-auto lg:overflow-x-visible">
          <table class="w-full text-left table-fixed">
            <thead class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[16%]">Produit</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[5%]">Taille</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[5%]">Code</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[10%]">Code-barres</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[8%]">Marque</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[8%]">Modèle</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[8%]">Catégorie</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-center w-[5%]" title="Stock de vente">Vente</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-center w-[5%]" title="Stock technique">Tech.</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-center w-[6%]">Seuil</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[24%]">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr
                v-for="product in paginatedProducts"
                :key="product.id"
                class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                :class="{ 'bg-amber-50 dark:bg-amber-900/20': product.stock <= product.alert_threshold }"
              >
                <td class="px-3 py-3 w-[16%]">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-medium text-gray-900 dark:text-white truncate" :title="product.name">{{ product.name }}</span>
                    <AlertTriangle
                      v-if="product.stock <= product.alert_threshold"
                      class="w-4 h-4 text-amber-500 shrink-0"
                    />
                  </div>
                </td>
                <td class="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 w-[5%]">{{ (product as any).size || '—' }}</td>
                <td class="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 w-[5%]">{{ product.code || '—' }}</td>
                <td class="px-3 py-3 text-sm w-[10%] min-w-0">
                  <template v-if="editingBarcode === product.id">
                    <input
                      v-model="barcodeValue"
                      type="text"
                      class="w-full max-w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm box-border"
                      placeholder="EAN..."
                      @keydown.enter="saveBarcode"
                      @keydown.escape="cancelEditBarcode"
                    />
                    <div class="flex gap-1 mt-1 flex-wrap">
                      <button type="button" @click="saveBarcode" class="text-xs text-emerald-600 hover:underline">OK</button>
                      <button type="button" @click="cancelEditBarcode" class="text-xs text-gray-500 hover:underline">Annuler</button>
                    </div>
                  </template>
                  <template v-else>
                    <span class="text-gray-600 dark:text-gray-300 truncate block" :title="product.barcode || ''">{{ product.barcode || '—' }}</span>
                    <button
                      type="button"
                      @click="startEditBarcode(product)"
                      class="mt-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs shrink-0"
                      title="Modifier le code-barres"
                    >
                      <Edit2 class="w-3.5 h-3.5 inline" />
                    </button>
                  </template>
                </td>
                <td class="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 w-[8%] truncate" :title="product.brand || ''">{{ product.brand || '—' }}</td>
                <td class="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 w-[8%] truncate" :title="product.model || ''">{{ product.model || '—' }}</td>
                <td class="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 w-[8%] truncate" :title="product.category?.name || ''">{{ product.category?.name || '—' }}</td>
                <td class="px-3 py-3 text-center font-semibold w-[5%]" :class="product.stock <= product.alert_threshold ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'">
                  {{ product.stock }}
                </td>
                <td class="px-3 py-3 text-center font-semibold w-[5%] text-blue-600 dark:text-blue-400">
                  {{ product.stock_technical ?? 0 }}
                </td>
                <td class="px-3 py-3 text-center w-[6%]">
                  <template v-if="editingThreshold === product.id">
                    <div class="flex items-center justify-center gap-2">
                      <input
                        v-model.number="thresholdValue"
                        type="number"
                        min="0"
                        class="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm text-center"
                        @keydown.enter="saveThreshold"
                      />
                      <button @click="saveThreshold" class="text-emerald-600 hover:underline text-sm">OK</button>
                      <button @click="cancelEditThreshold" class="text-gray-500 hover:underline text-sm">Annuler</button>
                    </div>
                  </template>
                  <template v-else>
                    <span class="text-gray-600 dark:text-gray-300">{{ product.alert_threshold }}</span>
                    <button
                      @click="startEditThreshold(product)"
                      class="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 inline-flex"
                      title="Modifier le seuil"
                    >
                      <Edit2 class="w-3.5 h-3.5" />
                    </button>
                  </template>
                </td>
                <td class="px-3 py-3 w-[24%]">
                  <div class="flex items-center gap-2 flex-wrap">
                    <button
                      @click="openMovementModal(product)"
                      class="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                      title="Ajouter un mouvement"
                    >
                      <Plus class="w-3.5 h-3.5" />
                      Mouvement
                    </button>
                    <button
                      @click="openHistory(product)"
                      class="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                      title="Historique"
                    >
                      <History class="w-3.5 h-3.5" />
                      Historique
                    </button>
                    <button
                      @click="openEditProductModal(product)"
                      class="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                      title="Modifier le produit"
                    >
                      <Edit2 class="w-3.5 h-3.5" />
                      Modifier
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="filteredProducts.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-400">
          Aucun produit à afficher.
        </p>

        <!-- Pagination -->
        <div
          v-if="!isLoading && filteredProducts.length > 0"
          class="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ paginationInfo.from }}-{{ paginationInfo.to }} sur {{ paginationInfo.total }} produits
            </span>
            <span class="text-sm text-gray-500 dark:text-gray-400">Par page</span>
            <select
              v-model.number="pageSize"
              class="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-gray-100"
            >
              <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
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

      <!-- Modal mouvement -->
      <Teleport to="body">
        <div
          v-if="showMovementModal && movementProduct"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Mouvement de stock</h3>
              <button @click="closeMovementModal" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
                <X class="w-5 h-5" />
              </button>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {{ movementProduct.name }}
              — Stock {{ movementStockType === 'technical' ? 'technique' : 'vente' }} actuel : <strong>{{ currentStockForMovement }}</strong>
            </p>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de stock</label>
                <div class="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <button
                    type="button"
                    @click="movementStockType = 'sale'"
                    :class="['flex-1 px-4 py-2 text-sm font-medium transition-colors', movementStockType === 'sale' ? 'bg-gray-900 dark:bg-emerald-600 text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600']"
                  >Vente</button>
                  <button
                    type="button"
                    @click="movementStockType = 'technical'"
                    :class="['flex-1 px-4 py-2 text-sm font-medium transition-colors', movementStockType === 'technical' ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600']"
                  >Technique</button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  v-model="movementType"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="in">Entrée</option>
                  <option value="out">Sortie</option>
                  <option value="adjustment">Fixer le stock</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ movementType === 'adjustment' ? 'Nouvelle valeur du stock' : 'Quantité' }}
                </label>
                <input
                  v-model.number="movementQuantity"
                  type="number"
                  :min="movementType === 'adjustment' ? 0 : 1"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  :placeholder="movementType === 'adjustment' ? `Actuellement : ${currentStockForMovement}` : ''"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motif</label>
                <input
                  v-model="movementReason"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Livraison, inventaire, perte..."
                />
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button
                @click="closeMovementModal"
                class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                @click="submitMovement"
                :disabled="isSaving || (movementType !== 'adjustment' && movementQuantity <= 0) || (movementType === 'adjustment' && movementQuantity < 0)"
                class="flex-1 px-4 py-2 bg-gray-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50"
              >
                {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Modal historique -->
      <Teleport to="body">
        <div
          v-if="showHistoryModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
            <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Historique des mouvements {{ historyProduct ? `— ${historyProduct.name}` : '' }}
              </h3>
              <button @click="closeHistory" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
                <X class="w-5 h-5" />
              </button>
            </div>
            <div class="p-6 overflow-y-auto flex-1">
              <div v-if="movements.length === 0" class="text-center text-gray-500 dark:text-gray-400 py-8">
                Aucun mouvement pour ce produit.
              </div>
              <ul v-else class="space-y-2">
                <li
                  v-for="m in movements"
                  :key="m.id"
                  class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div class="flex items-center gap-3">
                    <span
                      :class="[
                        'inline-flex items-center justify-center w-8 h-8 rounded-full',
                        m.type === 'in' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : m.type === 'out' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      ]"
                    >
                      <ArrowDownCircle v-if="m.type === 'in'" class="w-4 h-4" />
                      <ArrowUpCircle v-else-if="m.type === 'out'" class="w-4 h-4" />
                      <RefreshCw v-else class="w-4 h-4" />
                    </span>
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">{{ movementLabel(m.type, m.quantity) }} — {{ m.reason }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(m.created_at) }}</p>
                    </div>
                  </div>
                  <span
                    :class="[
                      'font-semibold',
                      m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    ]"
                  >
                    {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Modal ajout produit -->
      <Teleport to="body">
        <div
          v-if="showAddProductModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
        >
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full my-8 p-6 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Nouveau produit</h3>
              <button @click="closeAddProductModal" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="space-y-4">
              <!-- Code-barres en premier : focus auto pour scan à l'ouverture -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code-barres</label>
                <input
                  ref="barcodeInputRef"
                  v-model="newProduct.barcode"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Scannez ici ou saisissez (EAN…)"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Le champ se remplit automatiquement au scan. Obligatoire pour vendre en caisse.</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
                <input
                  v-model="newProduct.name"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex. Mocassin cuir"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                <input
                  v-model="newProduct.code"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex. MOC01"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
                <select
                  v-model="newProduct.category_id"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">— Choisir —</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <!-- Grilles de taille -->
              <div v-if="sizeGridForCategory.length > 0" class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tailles</label>
                <div v-if="showShoeSizeChoice" class="flex gap-2 mb-2">
                  <button
                    type="button"
                    @click="shoeSizeType = 'fr'"
                    :class="['px-3 py-1.5 rounded-lg text-sm font-medium', shoeSizeType === 'fr' ? 'bg-gray-900 dark:bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300']"
                  >
                    Française
                  </button>
                  <button
                    type="button"
                    @click="shoeSizeType = 'uk'"
                    :class="['px-3 py-1.5 rounded-lg text-sm font-medium', shoeSizeType === 'uk' ? 'bg-gray-900 dark:bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300']"
                  >
                    Anglaise
                  </button>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="size in sizeGridForCategory"
                    :key="size"
                    type="button"
                    @click="selectSize(size)"
                    :class="['px-3 py-2 rounded-lg text-sm font-medium transition-colors', selectedSize === size ? 'bg-gray-900 dark:bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600']"
                  >
                    {{ size }}
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marque</label>
                  <input
                    v-model="newProduct.brand"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ex. Lacoste"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modèle</label>
                  <input
                    v-model="newProduct.model"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ex. Classic"
                  />
                </div>
              </div>
              <!-- Prix : HT, TVA 20%, Coef, Prix de vente -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix HT (€)</label>
                  <input
                    v-model.number="newProduct.price_ht"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TVA</label>
                  <input
                    value="20%"
                    readonly
                    class="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-xl"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coef</label>
                  <input
                    v-model.number="newProductCoef"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix de vente TTC (€)</label>
                  <input
                    v-model.number="newProduct.price_ttc"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock vente</label>
                  <input
                    v-model.number="newProduct.stock"
                    type="number"
                    min="0"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock technique</label>
                  <input
                    v-model.number="newProduct.stock_technical"
                    type="number"
                    min="0"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seuil alerte</label>
                  <input
                    v-model.number="newProduct.alert_threshold"
                    type="number"
                    min="0"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button
                @click="closeAddProductModal"
                class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                @click="submitAddProduct"
                :disabled="isSaving || !newProduct.name.trim()"
                class="flex-1 px-4 py-2 bg-gray-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50"
              >
                {{ isSaving ? 'Enregistrement...' : 'Créer le produit' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Modal édition produit -->
      <Teleport to="body">
        <div
          v-if="showEditProductModal && editProduct"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
        >
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full my-8 p-6 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Modifier le produit</h3>
              <button @click="closeEditProductModal" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code-barres</label>
                <input
                  ref="editBarcodeInputRef"
                  v-model="editForm.barcode"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Scannez ici ou saisissez (EAN…)"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
                <input
                  v-model="editForm.name"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex. Mocassin cuir"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                <input
                  v-model="editForm.code"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex. MOC01"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
                <select
                  v-model="editForm.category_id"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">— Choisir —</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <!-- Grilles de taille (édition) -->
              <div v-if="sizeGridForCategory.length > 0" class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tailles</label>
                <div v-if="showShoeSizeChoice" class="flex gap-2 mb-2">
                  <button
                    type="button"
                    @click="shoeSizeType = 'fr'"
                    :class="['px-3 py-1.5 rounded-lg text-sm font-medium', shoeSizeType === 'fr' ? 'bg-gray-900 dark:bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300']"
                  >
                    Française
                  </button>
                  <button
                    type="button"
                    @click="shoeSizeType = 'uk'"
                    :class="['px-3 py-1.5 rounded-lg text-sm font-medium', shoeSizeType === 'uk' ? 'bg-gray-900 dark:bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300']"
                  >
                    Anglaise
                  </button>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="size in sizeGridForCategory"
                    :key="size"
                    type="button"
                    @click="selectSize(size)"
                    :class="['px-3 py-2 rounded-lg text-sm font-medium transition-colors', selectedSize === size ? 'bg-gray-900 dark:bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600']"
                  >
                    {{ size }}
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marque</label>
                  <input
                    v-model="editForm.brand"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ex. Lacoste"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modèle</label>
                  <input
                    v-model="editForm.model"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ex. Classic"
                  />
                </div>
              </div>
              <!-- Prix : HT, TVA 20%, Coef, Prix de vente -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix HT (€)</label>
                  <input
                    v-model.number="editForm.price_ht"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TVA</label>
                  <input
                    value="20%"
                    readonly
                    class="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-xl"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coef</label>
                  <input
                    v-model.number="editFormCoef"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix de vente TTC (€)</label>
                  <input
                    v-model.number="editForm.price_ttc"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seuil alerte</label>
                <input
                  v-model.number="editForm.alert_threshold"
                  type="number"
                  min="0"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button
                @click="closeEditProductModal"
                class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                @click="submitEditProduct"
                :disabled="isSaving || !editForm.name.trim()"
                class="flex-1 px-4 py-2 bg-gray-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50"
              >
                {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </main>
</template>
