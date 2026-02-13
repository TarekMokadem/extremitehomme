<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
} from 'lucide-vue-next';
import { useStock } from '../composables/useStock';
import { useAuth } from '../composables/useAuth';
import type { Product } from '../types/database';
import type { StockMovementType } from '../types/database';

const {
  productsWithStock,
  productsOnly,
  lowStockList,
  categories,
  movements,
  loadProducts,
  loadCategories,
  loadMovements,
  addMovement,
  createProduct,
  updateAlertThreshold,
  updateBarcode,
  isLoading,
  isSaving,
} = useStock();

const { vendor: currentVendor } = useAuth();

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

// Modal mouvement
const showMovementModal = ref(false);
const movementProduct = ref<Product | null>(null);
const movementType = ref<StockMovementType>('in');
const movementQuantity = ref<number>(1);
const movementReason = ref('');

function openMovementModal(product: Product) {
  movementProduct.value = product;
  movementType.value = 'in';
  movementQuantity.value = 1;
  movementReason.value = '';
  showMovementModal.value = true;
}

function closeMovementModal() {
  showMovementModal.value = false;
  movementProduct.value = null;
}

async function submitMovement() {
  if (!movementProduct.value) return;
  const qty = movementQuantity.value;
  if (qty <= 0 && movementType.value !== 'adjustment') return;
  if (movementType.value === 'adjustment' && qty === 0) return;

  try {
    await addMovement({
      product_id: movementProduct.value.id,
      type: movementType.value,
      quantity: movementQuantity.value,
      reason: movementReason.value || (movementType.value === 'in' ? 'Entrée stock' : movementType.value === 'out' ? 'Sortie stock' : 'Ajustement'),
      vendor_id: currentVendor.value?.id ?? null,
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

const movementLabel = (type: string, quantity: number) => {
  const q = Math.abs(quantity);
  if (type === 'in') return `+${q}`;
  if (type === 'out') return `-${q}`;
  return quantity >= 0 ? `+${quantity}` : `${quantity}`;
};

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
  tva_rate: 0.2,
  stock: 0,
  alert_threshold: 5,
});

function openAddProductModal() {
  newProduct.value = {
    name: '',
    code: '',
    barcode: '',
    category_id: '',
    brand: '',
    model: '',
    price_ht: 0,
    tva_rate: 0.2,
    stock: 0,
    alert_threshold: 5,
  };
  showAddProductModal.value = true;
  loadCategories();
}

function closeAddProductModal() {
  showAddProductModal.value = false;
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
      tva_rate: Number(newProduct.value.tva_rate) ?? 0.2,
      stock: Math.max(0, Number(newProduct.value.stock) || 0),
      alert_threshold: Math.max(0, Number(newProduct.value.alert_threshold) || 5),
    });
    closeAddProductModal();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement');
  }
}

onMounted(() => {
  loadProducts();
  loadMovements();
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

      <!-- Filtres + recherche -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
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
      <div v-if="isLoading && productsWithStock.length === 0" class="flex justify-center py-20">
        <RefreshCw class="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin" />
      </div>

      <!-- Tableau produits : 100% largeur, pas de scroll horizontal sur PC -->
      <div v-else class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="overflow-x-auto lg:overflow-x-visible">
          <table class="w-full text-left table-fixed">
            <thead class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[20%]">Produit</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[6%]">Code</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[12%]">Code-barres</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[9%]">Marque</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[9%]">Modèle</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[10%]">Catégorie</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-center w-[6%]">Stock</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-center w-[9%]">Seuil alerte</th>
                <th class="px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-[19%]">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr
                v-for="product in filteredProducts"
                :key="product.id"
                class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                :class="{ 'bg-amber-50 dark:bg-amber-900/20': product.stock <= product.alert_threshold }"
              >
                <td class="px-3 py-3 w-[20%]">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-medium text-gray-900 dark:text-white truncate" :title="product.name">{{ product.name }}</span>
                    <AlertTriangle
                      v-if="product.stock <= product.alert_threshold"
                      class="w-4 h-4 text-amber-500 shrink-0"
                    />
                  </div>
                </td>
                <td class="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 w-[6%]">{{ product.code || '—' }}</td>
                <td class="px-3 py-3 text-sm w-[12%] min-w-0">
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
                <td class="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 w-[9%] truncate" :title="product.brand || ''">{{ product.brand || '—' }}</td>
                <td class="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 w-[9%] truncate" :title="product.model || ''">{{ product.model || '—' }}</td>
                <td class="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 w-[10%] truncate" :title="product.category?.name || ''">{{ product.category?.name || '—' }}</td>
                <td class="px-3 py-3 text-center font-semibold w-[6%]" :class="product.stock <= product.alert_threshold ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'">
                  {{ product.stock }}
                </td>
                <td class="px-3 py-3 text-center w-[9%]">
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
                <td class="px-3 py-3 w-[19%]">
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
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="filteredProducts.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-400">
          Aucun produit à afficher.
        </p>
      </div>

      <!-- Modal mouvement -->
      <Teleport to="body">
        <div
          v-if="showMovementModal && movementProduct"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          @click.self="closeMovementModal"
        >
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Mouvement de stock</h3>
              <button @click="closeMovementModal" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
                <X class="w-5 h-5" />
              </button>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">{{ movementProduct.name }} (stock actuel : {{ movementProduct.stock }})</p>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  v-model="movementType"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="in">Entrée</option>
                  <option value="out">Sortie</option>
                  <option value="adjustment">Ajustement (+/-)</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantité</label>
                <input
                  v-model.number="movementQuantity"
                  type="number"
                  :min="movementType === 'out' ? 1 : movementType === 'adjustment' ? undefined : 1"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  :placeholder="movementType === 'adjustment' ? 'Ex. -2 ou +5' : ''"
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
                :disabled="isSaving || (movementQuantity <= 0 && movementType !== 'adjustment') || (movementType === 'adjustment' && movementQuantity === 0)"
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
          @click.self="closeHistory"
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
          @click.self="closeAddProductModal"
        >
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full my-8 p-6 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Nouveau produit</h3>
              <button @click="closeAddProductModal" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
                <input
                  v-model="newProduct.name"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex. Mocassin cuir"
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
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
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code-barres</label>
                  <input
                    v-model="newProduct.barcode"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Scannez ou saisissez (EAN…)"
                  />
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Obligatoire pour vendre ce produit au scan en caisse.</p>
                </div>
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
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TVA (ex. 0,20)</label>
                  <input
                    v-model.number="newProduct.tva_rate"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock initial</label>
                  <input
                    v-model.number="newProduct.stock"
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
    </div>
  </main>
</template>
