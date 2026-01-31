<script setup lang="ts">
import { computed, ref } from 'vue';
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
import { useSales } from '../composables/useSales';
import { useAuth } from '../composables/useAuth';
import { useClients } from '../composables/useClients';
import { useLoyalty } from '../composables/useLoyalty';
import type { PaymentMethod } from '../types/database';

const { 
  cartItems, 
  subtotalHT,
  totalTVA,
  subtotalTTC,
  total, 
  discountValue,
  discountType,
  discountAmount,
  selectedPaymentMethods,
  updateQuantity,
  removeFromCart,
  clearCart,
  setDiscount,
  setPayment,
  validateSale,
  isProcessing,
} = useSales();

const { vendor } = useAuth();
const { selectedClient } = useClients();
const { saveStamps, loadClientStamps } = useLoyalty();

// Pour le mode de réduction
const localDiscountType = ref<'euro' | 'percent'>('euro');
const localDiscount = ref(0);

// Méthode de paiement sélectionnée
const selectedPaymentMethod = ref<PaymentMethod>('card');

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

// Gestion du type de réduction
const setDiscountType = (type: 'euro' | 'percent') => {
  localDiscountType.value = type;
  // Recalculer la réduction
  if (type === 'percent') {
    localDiscount.value = Math.min(localDiscount.value, 100);
  }
  setDiscount(localDiscountType.value, localDiscount.value);
};

// Gestion de la réduction
const handleDiscountChange = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const value = Number(target.value);
  
  if (localDiscountType.value === 'percent') {
    localDiscount.value = Math.min(value, 100);
  } else {
    localDiscount.value = Math.min(value, subtotalTTC.value);
  }
  setDiscount(localDiscountType.value, localDiscount.value);
};

// Sélection du moyen de paiement
const selectPaymentMethod = (method: PaymentMethod) => {
  selectedPaymentMethod.value = method;
  // Définir le paiement pour le total
  setPayment(method, total.value);
};

// Validation du ticket
const handleValidate = async (): Promise<void> => {
  if (cartItems.value.length === 0) return;
  if (!selectedClient.value) {
    alert('Veuillez sélectionner ou créer un client avant de valider la vente.');
    return;
  }
  
  // S'assurer qu'un paiement est défini
  if (selectedPaymentMethods.value.length === 0) {
    setPayment(selectedPaymentMethod.value, total.value);
  }
  
  const sale = await validateSale(
    vendor.value?.id || 'demo',
    selectedClient.value?.id
  );
  
  if (sale) {
    // Sauvegarder les points de fidélité si un client est sélectionné
    if (selectedClient.value && vendor.value) {
      await saveStamps(selectedClient.value.id, vendor.value.id, sale.id);
      await loadClientStamps(selectedClient.value.id);
    }
    
    alert(`✅ Vente validée !\nTicket: ${sale.ticket_number}\nTotal: ${formatPrice(sale.total)}€`);
  }
};

// Date du ticket
const ticketDate = computed(() => {
  return new Date().toLocaleDateString('fr-FR');
});

// Max pour le champ réduction
const maxDiscount = computed(() => {
  return localDiscountType.value === 'percent' ? 100 : subtotalTTC.value;
});

// Sous-total pour compatibilité
const subtotal = computed(() => subtotalTTC.value);
</script>

<template>
  <div class="card h-full flex flex-col overflow-hidden">
    <!-- En-tête avec date -->
    <div class="p-4 md:p-5 border-b border-gray-200 bg-gray-50">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[10px] md:text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Date</p>
          <p class="text-xs md:text-sm font-semibold text-gray-900">{{ ticketDate }}</p>
        </div>
        <div class="text-right">
          <p class="text-[10px] md:text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Ticket</p>
          <p class="text-xs md:text-sm font-semibold text-gray-900">#001</p>
        </div>
      </div>
    </div>

    <!-- Liste des articles -->
    <div class="flex-1 overflow-y-auto p-4 md:p-5 space-y-2 md:space-y-3 min-h-0">
      <template v-if="cartItems.length > 0">
        <div
          v-for="item in cartItems"
          :key="`${item.product.id}-${item.vendor_id || 'default'}`"
          class="cart-item"
        >
          <div class="flex items-start justify-between gap-2 md:gap-3 mb-2 md:mb-3">
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 line-clamp-2 text-xs md:text-sm leading-snug">
                {{ item.product.name }}
              </p>
              <p v-if="item.vendor" class="text-[10px] text-gray-500 mt-0.5">
                par {{ item.vendor.initials || `${item.vendor.first_name} ${item.vendor.last_name}` }}
              </p>
            </div>
            <p class="font-bold text-gray-900 whitespace-nowrap text-sm md:text-base tabular-nums">
              {{ formatPrice(item.subtotal_ttc) }}€
            </p>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button
                @click="updateQuantity(item.product.id, item.quantity - 1, item.vendor_id)"
                class="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors"
                aria-label="Diminuer la quantité"
              >
                <Minus class="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <span class="w-7 md:w-9 text-center text-xs md:text-sm font-semibold tabular-nums">{{ item.quantity }}</span>
              <button
                @click="updateQuantity(item.product.id, item.quantity + 1, item.vendor_id)"
                class="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors"
                aria-label="Augmenter la quantité"
              >
                <Plus class="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
            <button
              @click="removeFromCart(item.product.id, item.vendor_id)"
              class="p-1.5 md:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Supprimer l'article"
            >
              <Trash2 class="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        </div>
      </template>
      
      <div v-else class="h-full flex items-center justify-center py-8">
        <p class="text-gray-400 text-xs md:text-sm">Aucun article</p>
      </div>
    </div>

    <!-- Réduction avec sélecteur élégant € / % -->
    <div class="px-4 py-3 md:px-5 md:py-4 border-t border-gray-100">
      <div class="flex flex-col gap-2 md:gap-3">
        <div class="flex items-center justify-between gap-2">
          <label class="text-xs md:text-sm text-gray-600 font-medium">Réduction</label>

          <!-- Segmented control moderne -->
          <div class="inline-flex items-center bg-gray-100 rounded-full p-0.5 shadow-inner border border-gray-200">
            <button
              @click="setDiscountType('euro')"
              :class="[
                'inline-flex items-center gap-0.5 md:gap-1 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold rounded-full transition-all duration-150',
                localDiscountType === 'euro'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              ]"
            >
              <Euro class="w-3 h-3 md:w-3.5 md:h-3.5" />
              <span class="hidden sm:inline">Montant</span>
              <span class="sm:hidden">€</span>
            </button>
            <button
              @click="setDiscountType('percent')"
              :class="[
                'inline-flex items-center gap-0.5 md:gap-1 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold rounded-full transition-all duration-150',
                localDiscountType === 'percent'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              ]"
            >
              <Percent class="w-3 h-3 md:w-3.5 md:h-3.5" />
              <span class="hidden sm:inline">Pourcentage</span>
              <span class="sm:hidden">%</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            type="number"
            :value="localDiscount"
            @input="handleDiscountChange"
            min="0"
            :max="maxDiscount"
            step="0.01"
            class="flex-1 px-3 md:px-4 py-2 md:py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs md:text-sm text-right focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 hover:border-gray-400 transition-all tabular-nums"
          />
          <span class="text-xs md:text-sm font-medium text-gray-500 min-w-[24px] md:min-w-[32px] text-center">
            {{ localDiscountType === 'percent' ? '%' : '€' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Moyens de paiement -->
    <div class="px-4 py-3 md:px-5 md:py-4 border-t border-gray-100 bg-gray-50">
      <p class="text-[10px] md:text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-2 md:mb-3">Règlement</p>
      <div class="grid grid-cols-3 md:grid-cols-2 gap-1.5 md:gap-2">
        <button
          v-for="method in paymentMethods"
          :key="method.id"
          @click="selectPaymentMethod(method.id)"
          :class="[
            'payment-btn text-[10px] md:text-xs',
            selectedPaymentMethod === method.id && 'active'
          ]"
        >
          <component :is="method.icon" class="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span class="font-medium truncate">{{ method.label }}</span>
        </button>
      </div>
    </div>

    <!-- Total -->
    <div class="p-4 md:p-5 border-t-2 border-gray-200 bg-white">
      <div class="space-y-2 md:space-y-2.5 mb-3 md:mb-4">
        <!-- Sous-total HT -->
        <div class="flex justify-between text-xs md:text-sm">
          <span class="text-gray-500">Sous-total HT</span>
          <span class="text-gray-700 tabular-nums">{{ formatPrice(subtotalHT) }}€</span>
        </div>
        <!-- TVA -->
        <div class="flex justify-between text-xs md:text-sm">
          <span class="text-gray-500">TVA (20%)</span>
          <span class="text-gray-700 tabular-nums">{{ formatPrice(totalTVA) }}€</span>
        </div>
        <!-- Sous-total TTC -->
        <div class="flex justify-between text-xs md:text-sm font-medium">
          <span class="text-gray-600">Sous-total TTC</span>
          <span class="text-gray-900 tabular-nums">{{ formatPrice(subtotalTTC) }}€</span>
        </div>
        <!-- Réduction -->
        <div v-if="localDiscount > 0" class="flex justify-between text-xs md:text-sm">
          <span class="text-gray-600">
            Réduction 
            <span class="text-[10px] md:text-xs">({{ localDiscountType === 'percent' ? `${localDiscount}%` : `${formatPrice(localDiscount)}€` }})</span>
          </span>
          <span class="text-red-600 font-medium tabular-nums">-{{ formatPrice(discountAmount) }}€</span>
        </div>
        <!-- Total -->
        <div class="flex justify-between text-xl md:text-2xl font-bold pt-2 md:pt-3 border-t border-gray-200">
          <span class="text-gray-900">Total</span>
          <span class="text-gray-900 tabular-nums">{{ formatPrice(total) }}€</span>
        </div>
      </div>

      <!-- Boutons d'action -->
      <div class="grid grid-cols-4 gap-1.5 md:gap-2">
        <button class="btn-icon-sm p-2 md:p-3" title="Imprimer" aria-label="Imprimer">
          <Printer class="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
        <button class="btn-icon-sm p-2 md:p-3" title="Email" aria-label="Envoyer par email">
          <Mail class="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
        <button 
          @click="clearCart" 
          class="btn-icon-sm p-2 md:p-3 text-orange-600 hover:bg-orange-50 hover:border-orange-200" 
          title="Annuler"
          aria-label="Annuler la transaction"
        >
          <RotateCcw class="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
        <button
          @click="handleValidate"
          :disabled="cartItems.length === 0 || isProcessing"
          :class="[
            'btn-icon-sm p-2 md:p-3',
            cartItems.length > 0 && !isProcessing
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
          ]"
          title="Valider"
          aria-label="Valider la transaction"
        >
          <span v-if="isProcessing" class="animate-spin">⏳</span>
          <Check v-else class="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
