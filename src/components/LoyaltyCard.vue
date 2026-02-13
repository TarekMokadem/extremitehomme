<script setup lang="ts">
import { Gift, Check, RotateCcw } from 'lucide-vue-next';
import { useLoyalty } from '../composables/useLoyalty';
import { useClients } from '../composables/useClients';

const { stamps, checkedCount, isCardComplete, stampsCount, toggleStamp, resetPointsToZero, loadClientStamps } = useLoyalty();
const { selectedClient } = useClients();

const handleResetPoints = async () => {
  if (!selectedClient.value || !confirm('Réinitialiser les points fidélité à 0 ?')) return;
  try {
    await resetPointsToZero(selectedClient.value.id);
    await loadClientStamps(selectedClient.value.id);
  } catch {
    alert('Erreur lors de la réinitialisation');
  }
};

// Formater la date en dd/mm/yyyy
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};
</script>

<template>
  <div class="card p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
          <Gift class="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
        </div>
        <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Carte fidélité</span>
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ checkedCount }}/{{ stampsCount }}</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="selectedClient"
          type="button"
          @click="handleResetPoints"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Réinitialiser les points à 0"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          Réinit. points
        </button>
        <span
          v-if="isCardComplete"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full text-xs font-semibold"
        >
          <Check class="w-3.5 h-3.5" />
          Complète
        </span>
      </div>
    </div>

    <!-- 12 tampons -->
    <div class="grid grid-cols-6 sm:grid-cols-12 gap-2 w-full">
      <button
        v-for="stamp in stamps"
        :key="stamp.position"
        @click="toggleStamp(stamp.position)"
        :class="[
          'relative aspect-square w-full max-w-none rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center overflow-hidden',
          stamp.isStamped
            ? 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100 dark:border-amber-500 dark:bg-amber-900/30 dark:hover:bg-amber-900/50'
            : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:hover:border-gray-500'
        ]"
      >
        <span
          :class="[
            'text-base font-bold',
            stamp.isStamped ? 'text-yellow-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'
          ]"
        >
          {{ stamp.position }}
        </span>
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="scale-0 opacity-0"
          enter-to-class="scale-100 opacity-100"
        >
          <div
            v-if="stamp.isStamped"
            class="absolute inset-0 flex items-center justify-center bg-yellow-500/20 dark:bg-amber-500/30"
          >
            <Check class="w-6 h-6 text-yellow-600 dark:text-amber-400 drop-shadow" />
          </div>
        </Transition>
        <span
          v-if="stamp.isStamped && stamp.date"
          class="absolute bottom-0.5 left-0 right-0 text-xs text-yellow-700 dark:text-amber-300 font-semibold leading-tight"
        >
          {{ formatDate(stamp.date) }}
        </span>
      </button>
    </div>
  </div>
</template>
