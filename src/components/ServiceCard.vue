<script setup lang="ts">
import { computed } from 'vue';
import { Clock } from 'lucide-vue-next';
import type { Product } from '../types/database';
import { useSales } from '../composables/useSales';
import { useProducts } from '../composables/useProducts';
import { useAuth } from '../composables/useAuth';

// Props
interface Props {
  service: Product;
}

const props = defineProps<Props>();

// Composables
const { addToCart, cartItems } = useSales();
const { vendor } = useAuth();
const { getCategoryBorderColor } = useProducts();

// Computed
const quantity = computed(() => {
  const item = cartItems.value.find(i => i.product.id === props.service.id);
  return item ? item.quantity : 0;
});

const borderColor = computed(() => getCategoryBorderColor(props.service));

// Handlers
const handleAddToCart = (): void => {
  addToCart(props.service, 1, vendor.value ?? undefined);
};
</script>

<template>
  <button
    @click="handleAddToCart"
    :aria-label="`Ajouter ${service.name} au panier`"
    :class="[
      'service-card',
      borderColor,
      quantity > 0 && 'active'
    ]"
  >
    <!-- Ligne du haut : code à gauche, prix à droite (+ quantité éventuelle) -->
    <div class="service-header">
      <div class="service-header-left">
        <span class="service-code">{{ service.code }}</span>
        <span
          v-if="quantity > 0"
          class="quantity-badge"
          :aria-label="`Quantité: ${quantity}`"
        >
          {{ quantity }}
        </span>
      </div>
      <span class="service-price">
        {{ service.price_ttc?.toFixed(2) || service.price_ht?.toFixed(2) }}€
      </span>
    </div>

    <!-- Centre : nom du service -->
    <div class="service-body">
      <h3 class="service-name">{{ service.name }}</h3>
      <span v-if="service.duration" class="service-duration">
        <Clock class="w-3 h-3 md:w-3.5 md:h-3.5" />
        <span class="hidden sm:inline">{{ service.duration }}min</span>
        <span class="sm:hidden">{{ service.duration }}'</span>
      </span>
    </div>
  </button>
</template>

<style scoped>
@reference "../style.css";

.service-card {
  @apply relative flex flex-col justify-between;
  @apply p-3 md:p-4 bg-white rounded-xl border-l-4;
  @apply shadow-sm hover:shadow-md;
  @apply transition-all duration-200 ease-in-out;
  @apply text-left cursor-pointer;
  @apply min-h-[80px] md:min-h-[100px];
  @apply dark:bg-gray-700 dark:shadow-none dark:hover:bg-gray-600;
}

.service-card:hover {
  @apply transform scale-[1.02];
}

.service-card.active {
  @apply ring-2 ring-gray-900 ring-offset-1 md:ring-offset-2;
  @apply dark:ring-emerald-500 dark:ring-offset-gray-800;
}

.service-header {
  @apply w-full flex items-start justify-between gap-2 mb-2;
}

.service-header-left {
  @apply flex items-center gap-1.5;
}

.service-code {
  @apply inline-flex items-center justify-center px-1.5 py-0.5 rounded-full;
  @apply bg-gray-900 text-white text-[10px] md:text-xs font-semibold;
  @apply dark:bg-gray-600 dark:text-white;
}

.quantity-badge {
  @apply inline-flex items-center justify-center w-4 h-4 md:w-5 md:h-5 rounded-full;
  @apply bg-red-600 text-white text-[10px] md:text-xs font-bold;
}

.service-name {
  @apply text-xs md:text-sm font-semibold text-gray-900 leading-snug text-center line-clamp-2;
  @apply dark:text-white;
}

.service-body {
  @apply flex-1 w-full flex flex-col items-center justify-center gap-1;
}

.service-info {
  @apply flex items-center justify-between w-full gap-2 md:gap-3 text-[10px] md:text-xs text-gray-600;
}

.service-price {
  @apply font-bold text-gray-900 text-sm md:text-base tabular-nums;
  @apply dark:text-white;
}

.service-duration {
  @apply flex items-center gap-0.5 md:gap-1 text-gray-500;
  @apply dark:text-white/80;
}
</style>
