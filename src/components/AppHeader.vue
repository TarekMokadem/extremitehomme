<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Scissors, ChevronDown } from 'lucide-vue-next';
import { useVendor } from '../composables/useVendor';

// Composables
const { currentVendor, vendors, setVendor } = useVendor();

// State
const currentDate = ref('');
const currentTime = ref('');
const showVendorMenu = ref(false);
let intervalId: number;

// Formatage de la date
const formatDate = (): string => {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Formatage de l'heure
const formatTime = (): string => {
  return new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Mise à jour de l'horloge
const updateClock = (): void => {
  currentDate.value = formatDate();
  currentTime.value = formatTime();
};

// Sélection vendeur
const selectVendor = (vendor: typeof currentVendor.value): void => {
  setVendor(vendor);
  showVendorMenu.value = false;
};

// Lifecycle hooks
onMounted(() => {
  updateClock();
  intervalId = window.setInterval(updateClock, 1000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<template>
  <header class="bg-gray-900 text-white px-8 py-4 flex items-center justify-between flex-shrink-0 shadow-xl">
    <!-- Logo & Nom -->
    <div class="flex items-center gap-4">
      <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
        <Scissors class="w-5 h-5" />
      </div>
      <div>
        <h1 class="text-lg font-semibold tracking-tight leading-tight">
          EXTRÉMITÉS <span class="font-normal text-gray-300">HOMME</span>
        </h1>
        <p class="text-[11px] text-gray-400 uppercase tracking-widest mt-0.5">Coiffeur · Barbier</p>
      </div>
    </div>

    <!-- Date & Heure -->
    <div class="flex items-center gap-8">
      <div class="text-right">
        <p class="text-xs text-gray-400 mb-1">{{ currentDate }}</p>
        <p class="text-xl font-mono font-medium tabular-nums">{{ currentTime }}</p>
      </div>
      
      <div class="w-px h-10 bg-gray-700"></div>
      
      <!-- Sélecteur de vendeur -->
      <div class="relative">
        <button
          @click="showVendorMenu = !showVendorMenu"
          class="flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <div :class="['w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-gray-600 font-semibold', currentVendor.color || 'bg-gray-600']">
            {{ currentVendor.initials }}
          </div>
          <div class="text-left">
            <p class="text-sm font-medium leading-tight">{{ currentVendor.name }}</p>
            <p class="text-xs text-emerald-400 mt-0.5">● En service</p>
          </div>
          <ChevronDown class="w-4 h-4 text-gray-400" />
        </button>

        <!-- Menu déroulant -->
        <Transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="showVendorMenu"
            class="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50"
          >
            <button
              v-for="vendor in vendors"
              :key="vendor.id"
              @click="selectVendor(vendor)"
              :class="[
                'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors',
                currentVendor.id === vendor.id && 'bg-gray-50'
              ]"
            >
              <div :class="['w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white', vendor.color || 'bg-gray-600']">
                {{ vendor.initials }}
              </div>
              <span class="text-sm font-medium text-gray-900">{{ vendor.name }}</span>
            </button>
          </div>
        </Transition>

        <!-- Backdrop pour fermer le menu -->
        <div
          v-if="showVendorMenu"
          @click="showVendorMenu = false"
          class="fixed inset-0 z-40"
        ></div>
      </div>
    </div>
  </header>
</template>
