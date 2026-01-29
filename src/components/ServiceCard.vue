<script setup lang="ts">
import { computed } from 'vue';
import { Clock } from 'lucide-vue-next';
import type { Product } from '../types/database';
import { useSales } from '../composables/useSales';
import { useProducts } from '../composables/useProducts';

// Props
interface Props {
  service: Product;
}

const props = defineProps<Props>();

// Composables
const { addToCart, cartItems } = useSales();
const { getCategoryBorderColor } = useProducts();

// Computed
const quantity = computed(() => {
  const item = cartItems.value.find(i => i.product.id === props.service.id);
  return item ? item.quantity : 0;
});

const borderColor = computed(() => getCategoryBorderColor(props.service));

// Handlers
const handleAddToCart = (): void => {
  addToCart(props.service);
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
    <!-- Badge quantité -->
    <div v-if="quantity > 0" class="quantity-badge" :aria-label="`Quantité: ${quantity}`">
      {{ quantity }}
    </div>

    <!-- Nom du service -->
    <h3 class="service-name">{{ service.name }}</h3>

    <!-- Prix et durée -->
    <div class="service-info">
      <span class="service-price">{{ service.price_ttc?.toFixed(2) || service.price_ht?.toFixed(2) }}€</span>
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
  @apply relative flex flex-col items-start justify-between;
  @apply p-3 md:p-4 bg-white rounded-xl border-l-4;
  @apply shadow-sm hover:shadow-md;
  @apply transition-all duration-200 ease-in-out;
  @apply text-left cursor-pointer;
  @apply min-h-[80px] md:min-h-[100px];
}

.service-card:hover {
  @apply transform scale-[1.02];
}

.service-card.active {
  @apply ring-2 ring-gray-900 ring-offset-1 md:ring-offset-2;
}

.quantity-badge {
  @apply absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2;
  @apply w-6 h-6 md:w-7 md:h-7 rounded-full;
  @apply bg-gray-900 text-white;
  @apply flex items-center justify-center;
  @apply text-[10px] md:text-xs font-bold;
  @apply shadow-lg;
  animation: pulse 0.5s ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.service-name {
  @apply text-xs md:text-sm font-semibold text-gray-900 mb-1.5 md:mb-2 leading-snug line-clamp-2;
}

.service-info {
  @apply flex items-center justify-between w-full gap-2 md:gap-3 text-[10px] md:text-xs text-gray-600;
}

.service-price {
  @apply font-bold text-gray-900 text-sm md:text-base tabular-nums;
}

.service-duration {
  @apply flex items-center gap-0.5 md:gap-1 text-gray-500;
}
</style>
