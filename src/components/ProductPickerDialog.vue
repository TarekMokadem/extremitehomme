<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, Package, Plus, X, ShoppingBag, Wrench } from 'lucide-vue-next';
import { useProducts } from '../composables/useProducts';
import { useSales } from '../composables/useSales';
import { looksLikeBarcode } from '../composables/useBarcodeScanner';
import type { Product, StockCategory } from '../types/database';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
}>();

const { physicalProducts, loadProducts, findByBarcode } = useProducts();
const { addToCart } = useSales();

const searchQuery = ref('');
const stockMode = ref<StockCategory>('sale');
const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

watch(isOpen, (open) => {
  if (open) {
    loadProducts();
    searchQuery.value = '';
    stockMode.value = 'sale';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }
});

const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  let list = physicalProducts.value;
  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.model?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
    );
  }
  return list;
});

interface SizeVariant {
  product: Product;
  size: string | null;
  stockSale: number;
  stockTech: number;
}

interface ProductModel {
  displayName: string;
  variants: SizeVariant[];
}

const getStockForMode = (p: Product) =>
  stockMode.value === 'technical' ? (p.stock_technical ?? 0) : p.stock;

const productsByBrand = computed(() => {
  const byBrand = new Map<string, Product[]>();
  for (const p of filteredProducts.value) {
    const brand = p.brand?.trim() || 'Sans marque';
    if (!byBrand.has(brand)) byBrand.set(brand, []);
    byBrand.get(brand)!.push(p);
  }

  const result: { brand: string; models: ProductModel[] }[] = [];
  for (const [brand, products] of byBrand) {
    const byModel = new Map<string, Product[]>();
    for (const p of products) {
      const key = `${p.name}|${p.model ?? ''}`;
      if (!byModel.has(key)) byModel.set(key, []);
      byModel.get(key)!.push(p);
    }

    const models: ProductModel[] = [];
    for (const [, variants] of byModel) {
      const displayName = variants[0].model
        ? `${variants[0].name} ${variants[0].model}`
        : variants[0].name;
      models.push({
        displayName,
        variants: variants.map((p) => ({
          product: p,
          size: p.size ?? null,
          stockSale: p.stock ?? 0,
          stockTech: p.stock_technical ?? 0,
        })),
      });
    }
    models.sort((a, b) => a.displayName.localeCompare(b.displayName));
    result.push({ brand, models });
  }
  result.sort((a, b) => a.brand.localeCompare(b.brand));
  return result;
});

const addProductToCart = (product: Product) => {
  const stock = getStockForMode(product);
  if (stock <= 0) return;
  addToCart(product, 1, undefined, stockMode.value);
};

const handleSearchKeydown = async (e: KeyboardEvent) => {
  if (e.key !== 'Enter') return;
  const code = searchQuery.value.trim();
  if (!code || !looksLikeBarcode(code)) return;
  e.preventDefault();
  const product = await findByBarcode(code);
  if (product) {
    addProductToCart(product);
    searchQuery.value = '';
  }
};

const close = () => {
  isOpen.value = false;
};
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        @click.self="close"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-picker-title"
        >
          <!-- En-tête -->
          <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h2 id="product-picker-title" class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package class="w-5 h-5 text-gray-500 dark:text-gray-400" />
              Ajouter un produit
            </h2>
            <button
              @click="close"
              class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Toggle Vente / Technique -->
          <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
            <div class="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden mb-3">
              <button
                @click="stockMode = 'sale'"
                :class="[
                  'flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                  stockMode === 'sale'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                ]"
              >
                <ShoppingBag class="w-4 h-4" />
                Produit de vente
              </button>
              <button
                @click="stockMode = 'technical'"
                :class="[
                  'flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                  stockMode === 'technical'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                ]"
              >
                <Wrench class="w-4 h-4" />
                Utilisation technique
              </button>
            </div>

            <!-- Barre de recherche (scan code-barres : taper ou scanner puis Entrée) -->
            <div class="relative">
              <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Rechercher ou scanner le code-barres..."
                class="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
                autofocus
                @keydown="handleSearchKeydown"
              />
            </div>
          </div>

          <!-- Liste des produits -->
          <div class="flex-1 overflow-y-auto p-4">
            <template v-if="productsByBrand.length > 0">
              <div>
                <div
                  v-for="{ brand, models } in productsByBrand"
                  :key="brand"
                  class="mb-6 last:mb-0"
                >
                  <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 sticky top-0 bg-white dark:bg-gray-800 py-1">
                    {{ brand }}
                  </h3>
                  <div class="space-y-4">
                    <div
                      v-for="model in models"
                      :key="`${brand}-${model.variants[0].product.id}`"
                      class="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50/50 dark:bg-gray-900/30"
                    >
                      <div class="p-3 flex items-center justify-between">
                        <div class="min-w-0 flex-1">
                          <p class="font-medium text-gray-900 dark:text-white truncate">
                            {{ model.displayName }}
                          </p>
                          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {{ model.variants[0].product.price_ttc?.toFixed(2) }}€
                          </p>
                        </div>
                      </div>

                      <div class="px-3 pb-3 flex flex-wrap gap-2">
                        <template v-for="v in model.variants" :key="v.product.id">
                          <button
                            v-if="v.size"
                            @click="addProductToCart(v.product)"
                            :disabled="(stockMode === 'sale' ? v.stockSale : v.stockTech) <= 0"
                            :class="[
                              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                              (stockMode === 'sale' ? v.stockSale : v.stockTech) > 0
                                ? (stockMode === 'sale'
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600')
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                            ]"
                          >
                            <span>{{ v.size }}</span>
                            <span class="text-xs opacity-90">({{ stockMode === 'sale' ? v.stockSale : v.stockTech }})</span>
                          </button>
                          <button
                            v-else
                            @click="addProductToCart(v.product)"
                            :disabled="(stockMode === 'sale' ? v.stockSale : v.stockTech) <= 0"
                            :class="[
                              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                              (stockMode === 'sale' ? v.stockSale : v.stockTech) > 0
                                ? (stockMode === 'sale'
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600')
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                            ]"
                          >
                            <Plus class="w-4 h-4" />
                            <span>Ajouter</span>
                            <span class="text-xs opacity-90">({{ stockMode === 'sale' ? v.stockSale : v.stockTech }})</span>
                          </button>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <div
              v-else
              class="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400"
            >
              <Package class="w-12 h-12 mb-4 opacity-40" />
              <p class="text-sm font-medium">Aucun produit trouvé</p>
              <p class="text-xs mt-1">Modifiez votre recherche</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
