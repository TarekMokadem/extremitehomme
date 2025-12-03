<script setup lang="ts">
import { computed } from 'vue';
import { 
  Banknote, 
  CreditCard, 
  Smartphone, 
  FileText, 
  Gift,
  Minus,
  Plus,
  Trash2,
  Printer,
  Mail,
  RotateCcw,
  Check,
  Percent,
  Euro
} from 'lucide-vue-next';
import { useCart } from '../composables/useCart';
import type { PaymentMethod } from '../types';

const { 
  cartItems, 
  subtotal, 
  total, 
  discount,
  discountType,
  discountAmount,
  selectedPaymentMethod,
  updateQuantity,
  removeFromCart,
  clearCart,
  setDiscount,
  setDiscountType,
  setPaymentMethod
} = useCart();

// Configuration des moyens de paiement
const paymentMethods: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: 'cash', label: 'Espèces', icon: Banknote },
  { id: 'card', label: 'CB', icon: CreditCard },
  { id: 'contactless', label: 'Sans contact', icon: Smartphone },
  { id: 'check', label: 'Chèque', icon: FileText },
  { id: 'gift_card', label: 'Cadeau', icon: Gift },
];

// Formatage du prix
const formatPrice = (price: number): string => {
  return price.toFixed(2);
};

// Gestion de la réduction
const handleDiscountChange = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const value = Number(target.value);
  
  // Limiter selon le type
  if (discountType.value === 'percent') {
    setDiscount(Math.min(value, 100));
  } else {
    setDiscount(Math.min(value, subtotal.value));
  }
};

// Validation du ticket
const handleValidate = (): void => {
  if (cartItems.value.length === 0) return;
  alert(`Transaction de ${formatPrice(total.value)}€ validée !`);
  clearCart();
};

// Date du ticket
const ticketDate = computed(() => {
  return new Date().toLocaleDateString('fr-FR');
});

// Max pour le champ réduction
const maxDiscount = computed(() => {
  return discountType.value === 'percent' ? 100 : subtotal.value;
});
</script>

<template>
  <div class="card h-full flex flex-col overflow-hidden">
    <!-- En-tête avec date -->
    <div class="p-5 border-b border-gray-200 bg-gray-50">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">Date</p>
          <p class="text-sm font-semibold text-gray-900">{{ ticketDate }}</p>
        </div>
        <div class="text-right">
          <p class="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">Ticket</p>
          <p class="text-sm font-semibold text-gray-900">#001</p>
        </div>
      </div>
    </div>

    <!-- Liste des articles -->
    <div class="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
      <template v-if="cartItems.length > 0">
        <div
          v-for="item in cartItems"
          :key="item.service.id"
          class="cart-item"
        >
          <div class="flex items-start justify-between gap-3 mb-3">
            <p class="font-medium text-gray-900 flex-1 line-clamp-2 text-sm leading-snug">
              {{ item.service.name }}
            </p>
            <p class="font-bold text-gray-900 whitespace-nowrap text-base tabular-nums">
              {{ formatPrice(item.service.price * item.quantity) }}€
            </p>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <button
                @click="updateQuantity(item.service.id, item.quantity - 1)"
                class="w-9 h-9 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors"
                aria-label="Diminuer la quantité"
              >
                <Minus class="w-4 h-4" />
              </button>
              <span class="w-9 text-center text-sm font-semibold tabular-nums">{{ item.quantity }}</span>
              <button
                @click="updateQuantity(item.service.id, item.quantity + 1)"
                class="w-9 h-9 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors"
                aria-label="Augmenter la quantité"
              >
                <Plus class="w-4 h-4" />
              </button>
            </div>
            <button
              @click="removeFromCart(item.service.id)"
              class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Supprimer l'article"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </template>
      
      <div v-else class="h-full flex items-center justify-center">
        <p class="text-gray-400 text-sm">Aucun article</p>
      </div>
    </div>

    <!-- Réduction avec sélecteur élégant € / % -->
    <div class="px-5 py-4 border-t border-gray-100">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          <label class="text-sm text-gray-600 font-medium">Réduction</label>

          <!-- Segmented control moderne -->
          <div class="inline-flex items-center bg-gray-100 rounded-full p-0.5 shadow-inner border border-gray-200">
            <button
              @click="setDiscountType('euro')"
              :class="[
                'inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-150',
                discountType === 'euro'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              ]"
            >
              <Euro class="w-3.5 h-3.5" />
              <span>Montant</span>
            </button>
            <button
              @click="setDiscountType('percent')"
              :class="[
                'inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-150',
                discountType === 'percent'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              ]"
            >
              <Percent class="w-3.5 h-3.5" />
              <span>Pourcentage</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            type="number"
            :value="discount"
            @input="handleDiscountChange"
            min="0"
            :max="maxDiscount"
            step="0.01"
            class="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 hover:border-gray-400 transition-all tabular-nums"
          />
          <span class="text-sm font-medium text-gray-500 min-w-[32px] text-center">
            {{ discountType === 'percent' ? '%' : '€' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Moyens de paiement -->
    <div class="px-5 py-4 border-t border-gray-100 bg-gray-50">
      <p class="text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-3">Règlement</p>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="method in paymentMethods"
          :key="method.id"
          @click="setPaymentMethod(method.id)"
          :class="[
            'payment-btn',
            selectedPaymentMethod === method.id && 'active'
          ]"
        >
          <component :is="method.icon" class="w-4 h-4" />
          <span class="font-medium">{{ method.label }}</span>
        </button>
      </div>
    </div>

    <!-- Total -->
    <div class="p-5 border-t-2 border-gray-200 bg-white">
      <div class="space-y-2.5 mb-4">
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Sous-total</span>
          <span class="text-gray-900 font-medium tabular-nums">{{ formatPrice(subtotal) }}€</span>
        </div>
        <div v-if="discount > 0" class="flex justify-between text-sm">
          <span class="text-gray-600">
            Réduction 
            <span class="text-xs">({{ discountType === 'percent' ? `${discount}%` : `${formatPrice(discount)}€` }})</span>
          </span>
          <span class="text-red-600 font-medium tabular-nums">-{{ formatPrice(discountAmount) }}€</span>
        </div>
        <div class="flex justify-between text-2xl font-bold pt-3 border-t border-gray-200">
          <span class="text-gray-900">Total</span>
          <span class="text-gray-900 tabular-nums">{{ formatPrice(total) }}€</span>
        </div>
      </div>

      <!-- Boutons d'action -->
      <div class="grid grid-cols-4 gap-2 mb-3">
        <button class="btn-icon-sm" title="Imprimer" aria-label="Imprimer">
          <Printer class="w-4 h-4" />
        </button>
        <button class="btn-icon-sm" title="Email" aria-label="Envoyer par email">
          <Mail class="w-4 h-4" />
        </button>
        <button 
          @click="clearCart" 
          class="btn-icon-sm text-orange-600 hover:bg-orange-50 hover:border-orange-200" 
          title="Annuler"
          aria-label="Annuler la transaction"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
        <button
          @click="handleValidate"
          :disabled="cartItems.length === 0"
          :class="[
            'btn-icon-sm',
            cartItems.length > 0
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
          ]"
          title="Valider"
          aria-label="Valider la transaction"
        >
          <Check class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
