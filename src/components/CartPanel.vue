<script setup lang="ts">
import { 
  ShoppingCart, 
  UserPlus, 
  Minus, 
  Plus, 
  Trash2, 
  Banknote, 
  CreditCard, 
  Smartphone, 
  FileText, 
  Gift,
  Check
} from 'lucide-vue-next';
import { useCart } from '../composables/useCart';
import { useClient } from '../composables/useClient';
import type { PaymentMethod } from '../types';

const { 
  cartItems, 
  subtotal, 
  total, 
  discount, 
  selectedPaymentMethod,
  removeFromCart, 
  updateQuantity, 
  clearCart,
  setDiscount,
  setPaymentMethod 
} = useCart();

const { openClientPanel, hasClientInfo, currentClient } = useClient();

const paymentMethods: { id: PaymentMethod; label: string; icon: any }[] = [
  { id: 'cash', label: 'Espèces', icon: Banknote },
  { id: 'card', label: 'Carte', icon: CreditCard },
  { id: 'contactless', label: 'Sans contact', icon: Smartphone },
  { id: 'check', label: 'Chèque', icon: FileText },
  { id: 'gift_card', label: 'Cadeau', icon: Gift },
];

const handleCheckout = () => {
  if (cartItems.value.length === 0) return;
  alert(`Transaction de ${total.value.toFixed(2)}€ validée !`);
  clearCart();
};

const formatPrice = (price: number) => {
  return price.toFixed(2);
};
</script>

<template>
  <div class="card-elevated h-full flex flex-col">
    <!-- Header -->
    <div class="p-5 border-b border-gray-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <ShoppingCart class="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-gray-900">Ticket</h2>
            <p class="text-xs text-gray-500">{{ cartItems.length }} article(s)</p>
          </div>
        </div>
        <button
          v-if="cartItems.length > 0"
          @click="clearCart"
          class="text-xs text-gray-500 hover:text-red-600 transition-colors"
        >
          Vider
        </button>
      </div>
    </div>

    <!-- Client info -->
    <button
      @click="openClientPanel"
      class="mx-5 mt-4 p-3 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all text-left"
    >
      <div v-if="hasClientInfo()" class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
          <span class="text-xs font-medium text-white">
            {{ currentClient.firstName?.[0] }}{{ currentClient.lastName?.[0] }}
          </span>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-900">
            {{ currentClient.firstName }} {{ currentClient.lastName }}
          </p>
          <p class="text-xs text-gray-500">{{ currentClient.phone || 'Pas de téléphone' }}</p>
        </div>
      </div>
      <div v-else class="flex items-center gap-3 text-gray-500">
        <UserPlus class="w-5 h-5" />
        <span class="text-sm">Ajouter un client</span>
      </div>
    </button>

    <!-- Cart items -->
    <div class="flex-1 overflow-y-auto p-5 space-y-3">
      <TransitionGroup name="list">
        <div
          v-for="item in cartItems"
          :key="item.service.id"
          class="p-3 rounded-lg bg-gray-50 border border-gray-100"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-medium text-gray-900 truncate">
                {{ item.service.name }}
              </h4>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ item.service.price }}€ / unité
              </p>
            </div>
            <p class="text-sm font-semibold text-gray-900 whitespace-nowrap">
              {{ formatPrice(item.service.price * item.quantity) }}€
            </p>
          </div>
          
          <div class="flex items-center justify-between mt-3">
            <div class="flex items-center gap-1">
              <button
                @click="updateQuantity(item.service.id, item.quantity - 1)"
                class="btn-icon w-7 h-7"
              >
                <Minus class="w-3.5 h-3.5" />
              </button>
              <span class="w-8 text-center text-sm font-medium text-gray-900">{{ item.quantity }}</span>
              <button
                @click="updateQuantity(item.service.id, item.quantity + 1)"
                class="btn-icon w-7 h-7"
              >
                <Plus class="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              @click="removeFromCart(item.service.id)"
              class="btn-icon w-7 h-7 hover:text-red-600"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </TransitionGroup>

      <!-- Empty state -->
      <div 
        v-if="cartItems.length === 0"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <ShoppingCart class="w-12 h-12 text-gray-300 mb-3" />
        <p class="text-gray-500 font-medium">Panier vide</p>
        <p class="text-gray-400 text-sm mt-1">Sélectionnez des services</p>
      </div>
    </div>

    <!-- Payment methods -->
    <div class="px-5 py-4 border-t border-gray-100">
      <p class="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Mode de paiement</p>
      <div class="grid grid-cols-5 gap-1.5">
        <button
          v-for="method in paymentMethods"
          :key="method.id"
          @click="setPaymentMethod(method.id)"
          :class="[
            'flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-all',
            selectedPaymentMethod === method.id
              ? 'bg-gray-900 text-white'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          ]"
        >
          <component :is="method.icon" class="w-4 h-4" />
          <span class="text-[10px] font-medium">{{ method.label }}</span>
        </button>
      </div>
    </div>

    <!-- Discount input -->
    <div class="px-5 pb-4">
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-500">Réduction</label>
        <input
          type="number"
          :value="discount"
          @input="setDiscount(Number(($event.target as HTMLInputElement).value))"
          min="0"
          :max="subtotal"
          class="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-gray-300"
        />
        <span class="text-sm text-gray-500">€</span>
      </div>
    </div>

    <!-- Summary -->
    <div class="p-5 border-t border-gray-200 bg-gray-50/50">
      <div class="space-y-2 mb-4">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Sous-total</span>
          <span class="text-gray-700 font-medium">{{ formatPrice(subtotal) }}€</span>
        </div>
        <div v-if="discount > 0" class="flex justify-between text-sm">
          <span class="text-gray-500">Réduction</span>
          <span class="text-red-600 font-medium">-{{ formatPrice(discount) }}€</span>
        </div>
        <div class="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
          <span class="text-gray-900">Total</span>
          <span class="text-gray-900">{{ formatPrice(total) }}€</span>
        </div>
      </div>

      <button
        @click="handleCheckout"
        :disabled="cartItems.length === 0"
        :class="[
          'w-full py-3.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2',
          cartItems.length > 0
            ? 'btn-success'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        ]"
      >
        <Check class="w-4 h-4" />
        <span>Valider {{ formatPrice(total) }}€</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
