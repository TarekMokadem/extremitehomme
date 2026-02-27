<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { 
  Banknote, 
  CreditCard, 
  Smartphone, 
  FileText, 
  Gift,
  HandCoins,
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
import { useProducts } from '../composables/useProducts';
import { useSettings } from '../composables/useSettings';
import { printReceipt } from '../lib/thermalPrint';
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
  fixedTotal,
  setFixedTotal,
  updateQuantity,
  removeFromCart,
  setItemFixedPrice,
  setItemVendor,
  clearCart,
  setDiscount,
  setPayment,
  clearPayments,
  validateSale,
  isProcessing,
  getMaxQuantityForItem,
  error: saleError,
} = useSales();

const { vendor, loadVendors } = useAuth();
const { selectedClient } = useClients();
const vendorsList = ref<import('../types/database').Vendor[]>([]);
onMounted(async () => {
  vendorsList.value = await loadVendors();
});
const { loadProducts } = useProducts();
const { saveStamps, loadClientStamps } = useLoyalty();
const { salonInfo, ticketHeader, ticketFooter } = useSettings();

// Pour le mode de réduction
const localDiscountType = ref<'euro' | 'percent'>('euro');
const localDiscount = ref(0);

// Méthode de paiement sélectionnée
const selectedPaymentMethod = ref<PaymentMethod>('card');

// Configuration des moyens de paiement (couleurs en normal + selected)
const paymentMethods: { id: PaymentMethod; label: string; icon: typeof Banknote; normalColor: string; selectedColor: string }[] = [
  { id: 'cash', label: 'Espèces', icon: Banknote, normalColor: 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300', selectedColor: 'bg-green-600 border-green-600 text-white' },
  { id: 'card', label: 'CB', icon: CreditCard, normalColor: 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', selectedColor: 'bg-blue-600 border-blue-600 text-white' },
  { id: 'contactless', label: 'Sans contact', icon: Smartphone, normalColor: 'border-violet-600 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300', selectedColor: 'bg-violet-600 border-violet-600 text-white' },
  { id: 'amex', label: 'American Express', icon: CreditCard, normalColor: 'border-red-600 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300', selectedColor: 'bg-red-600 border-red-600 text-white' },
  { id: 'check', label: 'Chèque', icon: FileText, normalColor: 'border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300', selectedColor: 'bg-gray-600 border-gray-600 text-white' },
  { id: 'gift_card', label: 'Chèque Cadeau', icon: Gift, normalColor: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200', selectedColor: 'bg-yellow-500 border-yellow-500 text-black' },
  { id: 'free', label: 'Gratuit', icon: HandCoins, normalColor: 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', selectedColor: 'bg-orange-500 border-orange-500 text-white' },
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

// Sélection du moyen de paiement (mode mono-paiement : remplace tout)
const selectPaymentMethod = (method: PaymentMethod) => {
  selectedPaymentMethod.value = method;
  clearPayments();
  setPayment(method, total.value);
};

// Synchroniser le montant du paiement quand le total change (ajout/suppression d'articles, réduction, etc.)
watch([total, selectedPaymentMethod], () => {
  if (total.value > 0 && selectedPaymentMethod.value) {
    setPayment(selectedPaymentMethod.value, total.value);
  }
}, { immediate: true });

// Validation du ticket
const handleValidate = async (): Promise<void> => {
  if (cartItems.value.length === 0) return;
  if (!selectedClient.value) {
    alert('Veuillez sélectionner ou créer un client avant de valider la vente.');
    return;
  }
  
  // Toujours synchroniser le paiement avec le total actuel (au cas où il a changé)
  setPayment(selectedPaymentMethod.value, total.value);

  const sale = await validateSale(
    vendor.value?.id,
    selectedClient.value?.id
  );
  
  if (sale) {
    // Sauvegarder les points de fidélité si un client est sélectionné
    if (selectedClient.value && vendor.value) {
      await saveStamps(selectedClient.value.id, vendor.value.id, sale.id);
      await loadClientStamps(selectedClient.value.id);
    }
    await loadProducts();
    alert(`✅ Vente validée !\nTicket: ${sale.ticket_number}\nTotal: ${formatPrice(sale.total)}€`);
  } else if (saleError.value) {
    alert(`❌ Erreur : ${saleError.value}`);
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

// Envoi par email (mailto)
const handleEmail = () => {
  if (cartItems.value.length === 0) return;

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR');
  const salonName = salonInfo.value.name || 'Extrémités Homme';

  const subject = `Facture ${dateStr} - ${salonName}`;

  const lines: string[] = [];
  lines.push(salonName);
  lines.push('─'.repeat(30));
  lines.push(`Date : ${dateStr}`);
  lines.push('');
  lines.push('Articles :');
  for (const item of cartItems.value) {
    const vendorLabel = item.vendor
      ? ` (${item.vendor.initials || `${item.vendor.first_name?.[0] ?? ''}${item.vendor.last_name?.[0] ?? ''}`})`
      : '';
    lines.push(`  ${item.product.name}${vendorLabel}`);
    lines.push(`    ${item.quantity} x ${formatPrice(item.subtotal_ttc / item.quantity)}€ = ${formatPrice(item.subtotal_ttc)}€`);
  }
  lines.push('');
  lines.push(`Sous-total HT : ${formatPrice(subtotalHT.value)}€`);
  lines.push(`TVA (20%) : ${formatPrice(totalTVA.value)}€`);
  lines.push(`Sous-total TTC : ${formatPrice(subtotalTTC.value)}€`);
  if (discountAmount.value > 0) {
    lines.push(`Réduction : -${formatPrice(discountAmount.value)}€`);
  }
  lines.push('─'.repeat(30));
  lines.push(`TOTAL : ${formatPrice(total.value)}€`);
  lines.push('');

  const currentMethod = paymentMethods.find(m => m.id === selectedPaymentMethod.value);
  lines.push(`Règlement : ${currentMethod?.label || selectedPaymentMethod.value}`);

  if (selectedClient.value) {
    lines.push('');
    lines.push(`Client : ${selectedClient.value.first_name} ${selectedClient.value.last_name}`);
  }

  lines.push('');
  lines.push('Merci de votre visite !');

  const body = lines.join('\n');
  const to = selectedClient.value?.email || '';
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
};

// Impression ticket thermique (format 80mm HOP-E801)
const handlePrintTicket = () => {
  if (cartItems.value.length === 0) return;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const items = cartItems.value.map((item) => {
    const v = item.vendor;
    const vendorName = v ? `${v.first_name ?? ''} ${v.last_name ?? ''}`.trim() : undefined;
    return {
      label: item.product.name,
      vendorName: vendorName || undefined,
      amount: item.subtotal_ttc,
    };
  });
  printReceipt({
    header: {
      name: ticketHeader.value.line1 || salonInfo.value.name,
      address: salonInfo.value.address,
      phone: salonInfo.value.phone,
    },
    dateTime: `${dateStr} ${timeStr}`,
    items,
    subtotal: subtotalTTC.value,
    discount: discountAmount.value > 0 ? discountAmount.value : undefined,
    total: total.value,
    footer: ticketFooter.value.line1 || 'Merci de votre visite',
  });
};
</script>

<template>
  <div class="card h-full flex flex-col overflow-hidden">
    <!-- En-tête avec date -->
    <div class="p-4 md:p-5 border-b border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[10px] md:text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1 dark:text-gray-400">Date</p>
          <p class="text-xs md:text-sm font-semibold text-gray-900 dark:text-gray-100">{{ ticketDate }}</p>
        </div>
        <div class="text-right">
          <p class="text-[10px] md:text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1 dark:text-gray-400">Ticket</p>
          <p class="text-xs md:text-sm font-semibold text-gray-900 dark:text-gray-100">#001</p>
        </div>
      </div>
    </div>

    <!-- Liste des articles -->
    <div class="flex-1 overflow-y-auto p-4 md:p-5 space-y-2 md:space-y-3 min-h-0">
      <template v-if="cartItems.length > 0">
        <div
          v-for="item in cartItems"
          :key="item.lineId"
          class="cart-item"
        >
          <div class="flex items-start justify-between gap-2 md:gap-3 mb-2 md:mb-3">
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 text-xs md:text-sm leading-snug">
                {{ item.product.name }}
              </p>
              <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span v-if="item.stockCategory === 'technical'" class="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">TECH</span>
                <p class="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span>Vendeur:</span>
                  <select
                    :value="item.vendor_id ?? ''"
                    @change="(e) => { const v = (e.target as HTMLSelectElement).value; setItemVendor(item.lineId, v ? vendorsList.find(x => x.id === v) ?? null : null); }"
                    class="text-[10px] md:text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 min-w-0 max-w-full"
                  >
                    <option value="">—</option>
                    <option v-for="v in vendorsList" :key="v.id" :value="v.id">
                      {{ v.initials || `${v.first_name?.[0] ?? ''}${v.last_name?.[0] ?? ''}` }} — {{ v.first_name }} {{ v.last_name }}
                    </option>
                  </select>
                </p>
              </div>
            </div>
            <p class="font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap text-sm md:text-base tabular-nums">
              {{ formatPrice(item.subtotal_ttc) }}€
            </p>
          </div>
          <!-- Prix unitaire fixe (ex. Bon cadeau) -->
          <div class="flex items-center gap-2 mb-2">
            <label class="text-[10px] text-gray-500 dark:text-gray-400 shrink-0">Prix unit. (€)</label>
            <input
              type="number"
              :value="item.fixedPriceTTC ?? ''"
              @input="(e) => { const v = (e.target as HTMLInputElement).value; setItemFixedPrice(item.lineId, v === '' ? null : Math.max(0, Number(v))); }"
              min="0"
              step="0.01"
              placeholder="Prix libre"
              class="flex-1 min-w-0 px-2 py-1.5 text-[11px] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 tabular-nums"
            />
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button
                @click="updateQuantity(item.lineId, item.quantity - 1)"
                class="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 dark:bg-gray-600 dark:border-gray-500 dark:hover:bg-gray-500 dark:text-gray-100 transition-colors"
                aria-label="Diminuer la quantité"
              >
                <Minus class="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <span class="w-7 md:w-9 text-center text-xs md:text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{{ item.quantity }}</span>
              <button
                @click="updateQuantity(item.lineId, item.quantity + 1)"
                :disabled="item.quantity >= getMaxQuantityForItem(item)"
                class="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 dark:bg-gray-600 dark:border-gray-500 dark:hover:bg-gray-500 dark:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Augmenter la quantité"
              >
                <Plus class="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
            <button
              @click="removeFromCart(item.lineId)"
              class="p-1.5 md:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              aria-label="Supprimer l'article"
            >
              <Trash2 class="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        </div>
      </template>
      
      <div v-else class="h-full flex items-center justify-center py-8">
        <p class="text-gray-400 dark:text-gray-500 text-xs md:text-sm">Aucun article</p>
      </div>
    </div>

    <!-- Réduction avec sélecteur élégant € / % -->
    <div class="px-4 py-3 md:px-5 md:py-4 border-t border-gray-100 dark:border-gray-700">
      <div class="flex flex-col gap-2 md:gap-3">
        <div class="flex items-center justify-between gap-2">
          <label class="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium">Réduction</label>

          <!-- Segmented control moderne -->
          <div class="inline-flex items-center bg-gray-100 dark:bg-gray-700 rounded-full p-0.5 shadow-inner border border-gray-200 dark:border-gray-600">
            <button
              @click="setDiscountType('euro')"
              :class="[
                'inline-flex items-center gap-0.5 md:gap-1 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold rounded-full transition-all duration-150',
                localDiscountType === 'euro'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
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
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
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
            class="flex-1 px-3 md:px-4 py-2 md:py-2.5 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 border border-gray-300 rounded-lg text-xs md:text-sm text-right focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30 hover:border-gray-400 transition-all tabular-nums"
          />
          <span class="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[24px] md:min-w-[32px] text-center">
            {{ localDiscountType === 'percent' ? '%' : '€' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Fixer le prix -->
    <div class="px-4 py-3 md:px-5 md:py-4 border-t border-gray-100 dark:border-gray-700">
      <div class="flex flex-col gap-2">
        <label class="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium">Fixer le prix total (€)</label>
        <div class="flex items-center gap-2">
          <input
            type="number"
            :value="fixedTotal ?? ''"
            @input="(e) => { const v = (e.target as HTMLInputElement).value; setFixedTotal(v === '' ? null : Math.max(0, Number(v))); }"
            min="0"
            step="0.01"
            placeholder="Prix libre"
            class="flex-1 px-3 md:px-4 py-2 md:py-2.5 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500 border border-gray-300 rounded-lg text-xs md:text-sm text-right focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30 tabular-nums"
          />
          <button
            v-if="fixedTotal != null"
            type="button"
            @click="setFixedTotal(null)"
            class="px-2 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 rounded-lg text-xs font-medium"
            title="Annuler le prix fixé"
          >
            Réinit
          </button>
        </div>
      </div>
    </div>

    <!-- Moyens de paiement -->
    <div class="px-4 py-3 md:px-5 md:py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <p class="text-[10px] md:text-[11px] text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold mb-2 md:mb-3">Règlement</p>
      <div class="grid grid-cols-3 md:grid-cols-2 gap-1.5 md:gap-2">
        <button
          v-for="method in paymentMethods"
          :key="method.id"
          @click="selectPaymentMethod(method.id)"
          :class="[
            'payment-btn text-[10px] md:text-xs',
            selectedPaymentMethod === method.id ? method.selectedColor : method.normalColor
          ]"
        >
          <component :is="method.icon" class="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span class="font-medium truncate">{{ method.label }}</span>
        </button>
      </div>
    </div>

    <!-- Total -->
    <div class="p-4 md:p-5 border-t-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div class="space-y-2 md:space-y-2.5 mb-3 md:mb-4">
        <!-- Sous-total HT -->
        <div class="flex justify-between text-xs md:text-sm">
          <span class="text-gray-500 dark:text-gray-400">Sous-total HT</span>
          <span class="text-gray-700 dark:text-gray-300 tabular-nums">{{ formatPrice(subtotalHT) }}€</span>
        </div>
        <!-- TVA -->
        <div class="flex justify-between text-xs md:text-sm">
          <span class="text-gray-500 dark:text-gray-400">TVA (20%)</span>
          <span class="text-gray-700 dark:text-gray-300 tabular-nums">{{ formatPrice(totalTVA) }}€</span>
        </div>
        <!-- Sous-total TTC -->
        <div class="flex justify-between text-xs md:text-sm font-medium">
          <span class="text-gray-600 dark:text-gray-400">Sous-total TTC</span>
          <span class="text-gray-900 dark:text-gray-100 tabular-nums">{{ formatPrice(subtotalTTC) }}€</span>
        </div>
        <!-- Réduction -->
        <div v-if="localDiscount > 0" class="flex justify-between text-xs md:text-sm">
          <span class="text-gray-600 dark:text-gray-400">
            Réduction 
            <span class="text-[10px] md:text-xs">({{ localDiscountType === 'percent' ? `${localDiscount}%` : `${formatPrice(localDiscount)}€` }})</span>
          </span>
          <span class="text-red-600 dark:text-red-400 font-medium tabular-nums">-{{ formatPrice(discountAmount) }}€</span>
        </div>
        <!-- Total -->
        <div class="flex justify-between text-xl md:text-2xl font-bold pt-2 md:pt-3 border-t border-gray-200 dark:border-gray-600">
          <span class="text-gray-900 dark:text-gray-100">Total</span>
          <span class="text-gray-900 dark:text-gray-100 tabular-nums">{{ formatPrice(total) }}€</span>
        </div>
      </div>

      <!-- Boutons d'action -->
      <div class="grid grid-cols-4 gap-1.5 md:gap-2">
        <button
          type="button"
          @click="handlePrintTicket"
          :disabled="cartItems.length === 0"
          class="btn-icon-sm p-2 md:p-3 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Imprimer le ticket"
          aria-label="Imprimer le ticket"
        >
          <Printer class="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
        <button
          type="button"
          @click="handleEmail"
          :disabled="cartItems.length === 0"
          class="btn-icon-sm p-2 md:p-3 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Email"
          aria-label="Envoyer par email"
        >
          <Mail class="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
        <button 
          @click="clearCart" 
          class="btn-icon-sm p-2 md:p-3 text-orange-600 hover:bg-orange-50 hover:border-orange-200 dark:text-orange-400 dark:hover:bg-orange-900/30 dark:hover:border-orange-700" 
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
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 dark:bg-emerald-600 dark:border-emerald-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-500'
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
