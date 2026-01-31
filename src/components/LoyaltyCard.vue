<script setup lang="ts">
import { computed } from 'vue';
import { Gift, Check } from 'lucide-vue-next';
import { useLoyalty } from '../composables/useLoyalty';

const { stamps, checkedCount, isCardComplete, toggleStamp } = useLoyalty();

// Formater la date
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
};
</script>

<template>
  <div class="card p-4 md:p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
          <Gift class="w-4 h-4 text-yellow-600" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Carte fidélité</h3>
          <p class="text-xs text-gray-500">{{ checkedCount }}/10 points</p>
        </div>
      </div>
      
      <!-- Badge carte complète -->
      <div
        v-if="isCardComplete"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold animate-pulse"
      >
        <Check class="w-3.5 h-3.5" />
        Complète !
      </div>
    </div>

    <!-- Grille de tampons (2 rangées de 5) -->
    <div class="grid grid-cols-5 gap-2">
      <button
        v-for="stamp in stamps"
        :key="stamp.position"
        @click="toggleStamp(stamp.position)"
        :class="[
          'relative aspect-square rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center overflow-hidden',
          stamp.isStamped
            ? 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100'
            : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400'
        ]"
      >
        <!-- Numéro -->
        <span
          :class="[
            'text-lg font-bold',
            stamp.isStamped ? 'text-yellow-600' : 'text-gray-400'
          ]"
        >
          {{ stamp.position }}
        </span>

        <!-- Check si tamponné -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="scale-0 opacity-0"
          enter-to-class="scale-100 opacity-100"
        >
          <div
            v-if="stamp.isStamped"
            class="absolute inset-0 flex items-center justify-center bg-yellow-500/20"
          >
            <Check class="w-8 h-8 text-yellow-600 drop-shadow" />
          </div>
        </Transition>

        <!-- Date (si déjà validé) -->
        <span
          v-if="stamp.isStamped && stamp.date"
          class="absolute bottom-0.5 text-[8px] text-yellow-700 font-medium"
        >
          {{ formatDate(stamp.date) }}
        </span>
      </button>
    </div>

    <!-- Info -->
    <div class="mt-4 p-3 bg-blue-50 rounded-lg">
      <p class="text-xs text-blue-700">
        <span class="font-semibold">💡 Astuce :</span>
        Cliquez sur les cases pour attribuer des points au client. 
        Les points seront validés lors du paiement.
      </p>
    </div>
  </div>
</template>
