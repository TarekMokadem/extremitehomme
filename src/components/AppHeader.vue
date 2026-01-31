<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Scissors, ChevronDown, LayoutGrid, History, Users, Wallet, BarChart3 } from 'lucide-vue-next';
import { useAuth } from '../composables/useAuth';
import type { Vendor } from '../types/database';

// Router
const router = useRouter();
const route = useRoute();

// Composables
const { vendor: currentVendor, loadVendors, setActiveVendor } = useAuth();

// Navigation
const navItems = [
  { path: '/', name: 'caisse', label: 'Caisse', icon: LayoutGrid },
  { path: '/historique', name: 'historique', label: 'Historique', icon: History },
  { path: '/clients', name: 'clients', label: 'Clients', icon: Users },
  { path: '/tiroir', name: 'tiroir', label: 'Tiroir', icon: Wallet },
  { path: '/stats', name: 'stats', label: 'Stats', icon: BarChart3 },
];

// State
const currentDate = ref('');
const currentTime = ref('');
const showVendorMenu = ref(false);
const vendors = ref<Vendor[]>([]);
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
const selectVendor = (vendor: Vendor): void => {
  setActiveVendor(vendor);
  showVendorMenu.value = false;
};

// Lifecycle hooks
onMounted(async () => {
  updateClock();
  intervalId = window.setInterval(updateClock, 1000);
  
  // Charger les vendeurs
  vendors.value = await loadVendors();
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<template>
  <header class="bg-gray-900 text-white px-4 py-3 md:px-6 md:py-4 lg:px-8 flex items-center justify-between flex-shrink-0 shadow-xl">
    <!-- Logo & Nom -->
    <div class="flex items-center gap-2 md:gap-4">
      <router-link to="/" class="flex items-center gap-2 md:gap-4 hover:opacity-80 transition-opacity">
        <div class="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
          <Scissors class="w-4 h-4 md:w-5 md:h-5" />
        </div>
        <div>
          <h1 class="text-sm md:text-lg font-semibold tracking-tight leading-tight">
            EXTRÉMITÉS <span class="font-normal text-gray-300 hidden sm:inline">HOMME</span>
          </h1>
          <p class="text-[10px] md:text-[11px] text-gray-400 uppercase tracking-widest mt-0.5 hidden sm:block">Coiffeur · Barbier</p>
        </div>
      </router-link>
    </div>

    <!-- Navigation centrale -->
    <nav class="hidden md:flex items-center gap-1">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        :class="[
          'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
          route.path === item.path
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        ]"
      >
        <component :is="item.icon" class="w-4 h-4" />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- Date & Heure & Vendeur -->
    <div class="flex items-center gap-3 md:gap-6 lg:gap-8">
      <!-- Date/Heure - masqué sur très petit écran -->
      <div class="text-right hidden sm:block">
        <p class="text-[10px] md:text-xs text-gray-400 mb-0.5 md:mb-1">{{ currentDate }}</p>
        <p class="text-base md:text-xl font-mono font-medium tabular-nums">{{ currentTime }}</p>
      </div>
      
      <div class="w-px h-8 md:h-10 bg-gray-700 hidden sm:block"></div>
      
      <!-- Sélecteur de vendeur -->
      <div class="relative">
        <button
          @click="showVendorMenu = !showVendorMenu"
          class="flex items-center gap-2 md:gap-3 px-2 py-1.5 md:px-4 md:py-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <div 
            :style="{ backgroundColor: currentVendor?.color || '#6B7280' }"
            class="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ring-2 ring-gray-600 font-semibold text-sm md:text-base text-white"
          >
            {{ currentVendor?.initials || '?' }}
          </div>
          <div class="text-left hidden md:block">
            <p class="text-sm font-medium leading-tight">{{ currentVendor?.first_name }} {{ currentVendor?.last_name }}</p>
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
            class="absolute right-0 top-full mt-2 w-56 md:w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50"
          >
            <button
              v-for="vendor in vendors"
              :key="vendor.id"
              @click="selectVendor(vendor)"
              :class="[
                'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors',
                currentVendor?.id === vendor.id && 'bg-gray-50'
              ]"
            >
              <div 
                :style="{ backgroundColor: vendor.color || '#6B7280' }"
                class="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white"
              >
                {{ vendor.initials }}
              </div>
              <span class="text-sm font-medium text-gray-900">{{ vendor.first_name }} {{ vendor.last_name }}</span>
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
