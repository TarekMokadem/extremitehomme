<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  Calendar,
  DollarSign,
  Plus,
  Minus,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-vue-next';
import { useCashRegister } from '../composables/useCashRegister';
import { useAuth } from '../composables/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const {
  currentRegister,
  movements,
  isLoading,
  error,
  totalIn,
  totalOut,
  movementsBalance,
  loadRegister,
  openRegister,
  addMovement,
  deleteMovement,
  closeRegister,
} = useCashRegister();

const { vendor } = useAuth();

// State
const selectedDate = ref(new Date().toISOString().split('T')[0]);
const openingAmountInput = ref(0);
const closingAmountInput = ref(0);
const closingNotes = ref('');
const cashSalesTotal = ref(0);

// Formulaire mouvement
const movementType = ref<'in' | 'out'>('out');
const movementAmount = ref(0);
const movementLabel = ref('');

// Modals
const showOpenModal = ref(false);
const showCloseModal = ref(false);
const showMovementModal = ref(false);

// Charger la caisse quand la date change
watch(selectedDate, (newDate) => {
  loadRegister(newDate);
  loadCashSales(newDate);
});

onMounted(() => {
  loadRegister(selectedDate.value);
  loadCashSales(selectedDate.value);
});

// Charger le total des ventes en espèces du jour
const loadCashSales = async (date: string) => {
  if (!isSupabaseConfigured()) {
    cashSalesTotal.value = 0;
    return;
  }

  try {
    const { data } = await supabase
      .from('payments')
      .select('amount, sale:sales!inner(created_at)')
      .eq('method', 'cash')
      .gte('sale.created_at', `${date}T00:00:00`)
      .lt('sale.created_at', `${date}T23:59:59`);

    cashSalesTotal.value = (data || []).reduce((sum: number, p: any) => sum + p.amount, 0);
  } catch (err) {
    console.error('Erreur chargement ventes espèces:', err);
    cashSalesTotal.value = 0;
  }
};

// Montant théorique attendu
const expectedAmount = computed(() => {
  if (!currentRegister.value) return 0;
  return currentRegister.value.opening_amount + cashSalesTotal.value + totalIn.value - totalOut.value;
});

// État de la caisse
const isOpen = computed(() => currentRegister.value?.status === 'open');
const isClosed = computed(() => currentRegister.value?.status === 'closed');

// Formatage
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPrice = (amount: number) => amount.toFixed(2);

// Handlers
const handleOpenRegister = async () => {
  await openRegister(selectedDate.value, openingAmountInput.value, vendor.value?.id);
  showOpenModal.value = false;
  openingAmountInput.value = 0;
};

const handleAddMovement = async () => {
  if (!movementLabel.value.trim() || movementAmount.value <= 0) return;
  
  await addMovement(movementType.value, movementAmount.value, movementLabel.value, vendor.value?.id);
  showMovementModal.value = false;
  movementLabel.value = '';
  movementAmount.value = 0;
};

const handleCloseRegister = async () => {
  await closeRegister(closingAmountInput.value, cashSalesTotal.value, closingNotes.value);
  showCloseModal.value = false;
  closingAmountInput.value = 0;
  closingNotes.value = '';
};

const openCloseModal = () => {
  closingAmountInput.value = expectedAmount.value;
  showCloseModal.value = true;
};
</script>

<template>
  <main class="flex-1 p-4 lg:p-6 overflow-auto">
    <div class="max-w-4xl mx-auto space-y-6">
      
      <!-- En-tête -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl lg:text-2xl font-bold text-gray-900">Tiroir de caisse</h1>
          <p class="text-sm text-gray-500 mt-1">Gérez le fond de caisse et les mouvements</p>
        </div>

        <!-- Sélecteur de date -->
        <div class="flex items-center gap-3">
          <Calendar class="w-5 h-5 text-gray-400" />
          <input
            v-model="selectedDate"
            type="date"
            class="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
      </div>

      <!-- Date affichée -->
      <div class="text-center py-2">
        <p class="text-lg font-semibold text-gray-700 capitalize">{{ formatDate(selectedDate) }}</p>
      </div>

      <!-- État : Caisse non ouverte -->
      <div v-if="!currentRegister && !isLoading" class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Lock class="w-8 h-8 text-gray-400" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Caisse fermée</h2>
        <p class="text-gray-500 mb-6">Aucune caisse ouverte pour cette date</p>
        <button
          @click="showOpenModal = true"
          class="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
        >
          <Unlock class="w-5 h-5" />
          Ouvrir la caisse
        </button>
      </div>

      <!-- État : Chargement -->
      <div v-else-if="isLoading" class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <RefreshCw class="w-8 h-8 text-gray-400 animate-spin mx-auto" />
      </div>

      <!-- Caisse ouverte ou fermée -->
      <template v-else-if="currentRegister">
        <!-- Résumé -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Fond de caisse</p>
            <p class="text-xl font-bold text-gray-900">{{ formatPrice(currentRegister.opening_amount) }}€</p>
          </div>
          <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Ventes espèces</p>
            <p class="text-xl font-bold text-emerald-600">+{{ formatPrice(cashSalesTotal) }}€</p>
          </div>
          <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Mouvements</p>
            <p :class="['text-xl font-bold', movementsBalance >= 0 ? 'text-emerald-600' : 'text-red-600']">
              {{ movementsBalance >= 0 ? '+' : '' }}{{ formatPrice(movementsBalance) }}€
            </p>
          </div>
          <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Solde attendu</p>
            <p class="text-xl font-bold text-gray-900">{{ formatPrice(expectedAmount) }}€</p>
          </div>
        </div>

        <!-- Statut de la caisse -->
        <div 
          :class="[
            'rounded-xl p-4 flex items-center gap-3',
            isOpen ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-100 border border-gray-200'
          ]"
        >
          <component :is="isOpen ? Unlock : Lock" :class="['w-5 h-5', isOpen ? 'text-emerald-600' : 'text-gray-500']" />
          <div class="flex-1">
            <p :class="['font-semibold', isOpen ? 'text-emerald-700' : 'text-gray-700']">
              {{ isOpen ? 'Caisse ouverte' : 'Caisse fermée' }}
            </p>
            <p class="text-sm text-gray-500">
              {{ isOpen ? `Ouverte à ${formatTime(currentRegister.opened_at)}` : `Fermée à ${formatTime(currentRegister.closed_at || '')}` }}
            </p>
          </div>
          <template v-if="isOpen">
            <button
              @click="showMovementModal = true"
              class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Plus class="w-4 h-4" />
              Mouvement
            </button>
            <button
              @click="openCloseModal"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Lock class="w-4 h-4" />
              Fermer
            </button>
          </template>
        </div>

        <!-- Résultat fermeture -->
        <div v-if="isClosed && currentRegister.difference !== null" class="rounded-xl p-4 flex items-center gap-3" :class="currentRegister.difference === 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'">
          <component :is="currentRegister.difference === 0 ? CheckCircle : AlertCircle" :class="['w-6 h-6', currentRegister.difference === 0 ? 'text-emerald-600' : 'text-amber-600']" />
          <div class="flex-1">
            <p :class="['font-semibold', currentRegister.difference === 0 ? 'text-emerald-700' : 'text-amber-700']">
              {{ currentRegister.difference === 0 ? 'Caisse juste' : 'Écart de caisse' }}
            </p>
            <p v-if="currentRegister.difference !== 0" class="text-sm text-amber-600">
              Écart : {{ currentRegister.difference > 0 ? '+' : '' }}{{ formatPrice(currentRegister.difference) }}€
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500">Montant compté</p>
            <p class="text-lg font-bold text-gray-900">{{ formatPrice(currentRegister.closing_amount || 0) }}€</p>
          </div>
        </div>

        <!-- Liste des mouvements -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-4 border-b border-gray-200">
            <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider">Mouvements du jour</h3>
          </div>

          <div v-if="movements.length === 0" class="p-8 text-center text-gray-500">
            <DollarSign class="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p>Aucun mouvement</p>
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="movement in movements"
              :key="movement.id"
              class="px-4 py-3 flex items-center gap-4"
            >
              <div 
                :class="[
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  movement.type === 'in' ? 'bg-emerald-100' : 'bg-red-100'
                ]"
              >
                <component 
                  :is="movement.type === 'in' ? ArrowDownCircle : ArrowUpCircle" 
                  :class="['w-5 h-5', movement.type === 'in' ? 'text-emerald-600' : 'text-red-600']"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ movement.label }}</p>
                <p class="text-xs text-gray-500">{{ formatTime(movement.created_at) }}</p>
              </div>
              <p 
                :class="[
                  'font-bold text-lg',
                  movement.type === 'in' ? 'text-emerald-600' : 'text-red-600'
                ]"
              >
                {{ movement.type === 'in' ? '+' : '-' }}{{ formatPrice(movement.amount) }}€
              </p>
              <button
                v-if="isOpen"
                @click="deleteMovement(movement.id)"
                class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Modal Ouverture -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showOpenModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div class="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 class="text-lg font-bold text-gray-900">Ouvrir la caisse</h3>
              <button @click="showOpenModal = false" class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <X class="w-5 h-5" />
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Fond de caisse (€)</label>
                <input
                  v-model.number="openingAmountInput"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-semibold text-center focus:outline-none focus:border-gray-900"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div class="p-4 border-t border-gray-200 flex gap-3">
              <button @click="showOpenModal = false" class="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium">
                Annuler
              </button>
              <button @click="handleOpenRegister" class="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium">
                Ouvrir
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Modal Mouvement -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showMovementModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div class="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 class="text-lg font-bold text-gray-900">Ajouter un mouvement</h3>
              <button @click="showMovementModal = false" class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <X class="w-5 h-5" />
              </button>
            </div>
            <div class="p-6 space-y-4">
              <!-- Type -->
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Type</label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    @click="movementType = 'out'"
                    :class="[
                      'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors font-medium',
                      movementType === 'out' 
                        ? 'border-red-500 bg-red-50 text-red-700' 
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    ]"
                  >
                    <Minus class="w-4 h-4" />
                    Dépense / Sortie
                  </button>
                  <button
                    @click="movementType = 'in'"
                    :class="[
                      'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors font-medium',
                      movementType === 'in' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    ]"
                  >
                    <Plus class="w-4 h-4" />
                    Entrée
                  </button>
                </div>
              </div>

              <!-- Libellé -->
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Libellé</label>
                <input
                  v-model="movementLabel"
                  type="text"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900"
                  placeholder="Ex: Achat fournitures, Retrait banque..."
                />
              </div>

              <!-- Montant -->
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Montant (€)</label>
                <input
                  v-model.number="movementAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-semibold text-center focus:outline-none focus:border-gray-900"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div class="p-4 border-t border-gray-200 flex gap-3">
              <button @click="showMovementModal = false" class="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium">
                Annuler
              </button>
              <button 
                @click="handleAddMovement" 
                :disabled="!movementLabel.trim() || movementAmount <= 0"
                class="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-medium disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Modal Fermeture -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showCloseModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div class="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 class="text-lg font-bold text-gray-900">Fermer la caisse</h3>
              <button @click="showCloseModal = false" class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <X class="w-5 h-5" />
              </button>
            </div>
            <div class="p-6 space-y-4">
              <!-- Récapitulatif -->
              <div class="bg-gray-50 rounded-xl p-4 space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Fond de caisse</span>
                  <span class="font-medium">{{ formatPrice(currentRegister?.opening_amount || 0) }}€</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Ventes espèces</span>
                  <span class="font-medium text-emerald-600">+{{ formatPrice(cashSalesTotal) }}€</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Mouvements</span>
                  <span :class="['font-medium', movementsBalance >= 0 ? 'text-emerald-600' : 'text-red-600']">
                    {{ movementsBalance >= 0 ? '+' : '' }}{{ formatPrice(movementsBalance) }}€
                  </span>
                </div>
                <div class="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                  <span>Solde attendu</span>
                  <span>{{ formatPrice(expectedAmount) }}€</span>
                </div>
              </div>

              <!-- Montant compté -->
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Montant réellement compté (€)</label>
                <input
                  v-model.number="closingAmountInput"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-semibold text-center focus:outline-none focus:border-gray-900"
                />
              </div>

              <!-- Écart -->
              <div v-if="closingAmountInput !== expectedAmount" class="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle class="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p class="text-sm text-amber-700">
                  Écart de <span class="font-bold">{{ formatPrice(closingAmountInput - expectedAmount) }}€</span>
                </p>
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Notes (optionnel)</label>
                <textarea
                  v-model="closingNotes"
                  rows="2"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-gray-900 resize-none"
                  placeholder="Remarques sur la journée..."
                ></textarea>
              </div>
            </div>
            <div class="p-4 border-t border-gray-200 flex gap-3">
              <button @click="showCloseModal = false" class="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium">
                Annuler
              </button>
              <button @click="handleCloseRegister" class="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-medium">
                Fermer la caisse
              </button>
            </div>
          </div>
        </div>
      </Transition>

    </div>
  </main>
</template>
