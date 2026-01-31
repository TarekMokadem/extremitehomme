<script setup lang="ts">
import { computed } from 'vue';
import { Gift, Check } from 'lucide-vue-next';
import { useLoyalty } from '../composables/useLoyalty';

const { stamps, checkedCount, isCardComplete, toggleStamp } = useLoyalty();

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
        <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
          <Gift class="w-4 h-4 text-yellow-600" />
        </div>
        <span class="text-sm font-semibold text-gray-900">Carte fidélité</span>
        <span class="text-xs text-gray-500">{{ checkedCount }}/10</span>
      </div>
      <span
        v-if="isCardComplete"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold"
      >
        <Check class="w-3.5 h-3.5" />
        Complète
      </span>
    </div>

    <!-- 10 tampons sur une ligne, toute la largeur -->
    <div class="grid grid-cols-10 gap-2 w-full">
      <button
        v-for="stamp in stamps"
        :key="stamp.position"
        @click="toggleStamp(stamp.position)"
        :class="[
          'relative aspect-square w-full max-w-none rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center overflow-hidden',
          stamp.isStamped
            ? 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100'
            : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400'
        ]"
      >
        <span
          :class="[
            'text-base font-bold',
            stamp.isStamped ? 'text-yellow-600' : 'text-gray-400'
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
            class="absolute inset-0 flex items-center justify-center bg-yellow-500/20"
          >
            <Check class="w-6 h-6 text-yellow-600 drop-shadow" />
          </div>
        </Transition>
        <span
          v-if="stamp.isStamped && stamp.date"
          class="absolute bottom-0.5 left-0 right-0 text-xs text-yellow-700 font-semibold leading-tight"
        >
          {{ formatDate(stamp.date) }}
        </span>
      </button>
    </div>
  </div>
</template>
