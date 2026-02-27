<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Scissors, ChevronDown, LayoutGrid, History, Users, Wallet, BarChart3, Settings, Package, Sun, Moon, FileText, UserCheck, Euro, CalendarDays, Calculator, LogOut } from 'lucide-vue-next';
import { useAuth } from '../composables/useAuth';
import { useTheme } from '../composables/useTheme';

const route = useRoute();
const router = useRouter();

// Composables
const { user, vendor: currentVendor, signOut } = useAuth();
const { isDark, toggleTheme } = useTheme();

// Navigation (Tiroir et Fin de journée regroupés dans "Caisse")
const navItems = [
  { path: '/', name: 'caisse', label: 'Caisse', icon: LayoutGrid },
  { path: '/historique', name: 'historique', label: 'Historique', icon: History },
  { path: '/clients', name: 'clients', label: 'Clients', icon: Users },
  { path: '/stock', name: 'stock', label: 'Stock', icon: Package },
  {
    group: 'caisse',
    label: 'Caisse',
    icon: Wallet,
    items: [
      { path: '/tiroir', name: 'tiroir', label: 'Tiroir de caisse', icon: Wallet },
      { path: '/fin-de-journee', name: 'fin-de-journee', label: 'Fin de journée', icon: FileText },
    ],
  },
  {
    group: 'stats',
    label: 'Stats',
    icon: BarChart3,
    items: [
      { path: '/stats', name: 'stats', label: 'Statistiques générales', icon: BarChart3 },
      { path: '/stats/employe', name: 'stats-employe', label: 'Stats par employé', icon: UserCheck },
      { path: '/stats/ca', name: 'stats-ca', label: 'Chiffre d\'affaires', icon: Euro },
      { path: '/stats/recap', name: 'stats-recap', label: 'Récap mensuel', icon: CalendarDays },
      { path: '/valeur-theorique', name: 'valeur-theorique', label: 'Valeur théorique', icon: Calculator },
    ],
  },
  { path: '/parametres', name: 'parametres', label: 'Paramètres', icon: Settings },
];

// State
const openDropdown = ref<string | null>(null);
const currentDate = ref('');
const currentTime = ref('');
const showUserMenu = ref(false);
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

const closeDropdowns = () => { openDropdown.value = null; };

async function handleSignOut() {
  await signOut();
  showUserMenu.value = false;
  router.push('/login');
}

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
  <header class="bg-gray-900 text-white px-4 py-3 md:px-6 md:py-4 lg:px-8 flex items-center justify-between flex-shrink-0 shadow-xl">
    <!-- Logo & Nom -->
    <div class="flex items-center gap-2 md:gap-4">
      <router-link to="/" class="flex items-center gap-2 md:gap-4 hover:opacity-80 transition-opacity">
        <div class="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
          <Scissors class="w-4 h-4 md:w-5 md:h-5" />
        </div>
        <div>
          <h1 class="text-sm md:text-lg font-semibold tracking-tight leading-tight">
            EXTRÉMITÉS <span class="font-normal text-gray-300 hidden sm:inline">HOMMES</span>
          </h1>
          <p class="text-[10px] md:text-[11px] text-gray-400 uppercase tracking-widest mt-0.5 hidden sm:block">Chausseur · Coiffeur · Barbier</p>
        </div>
      </router-link>
    </div>

    <!-- Navigation centrale -->
    <nav class="hidden md:flex items-center gap-1">
      <template v-for="item in navItems" :key="item.path || item.group">
        <router-link
          v-if="item.path"
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
        <div v-else class="relative">
          <button
            @click="openDropdown = openDropdown === item.group ? null : (item.group ?? null)"
            :class="[
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              item.items?.some((i: any) => route.path === i.path)
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            ]"
          >
            <component :is="item.icon" class="w-4 h-4" />
            <span>{{ item.label }}</span>
            <ChevronDown class="w-4 h-4" />
          </button>
          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="openDropdown === item.group"
              class="absolute left-0 top-full mt-1 w-56 bg-gray-800 rounded-xl shadow-xl border border-gray-700 py-2 z-50"
            >
              <router-link
                v-for="sub in item.items"
                :key="sub.path"
                :to="sub.path"
                @click="openDropdown = null"
                :class="[
                  'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                  route.path === sub.path
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                ]"
              >
                <component :is="sub.icon" class="w-4 h-4" />
                {{ sub.label }}
              </router-link>
            </div>
          </Transition>
        </div>
      </template>
    </nav>

    <!-- Date & Heure, thème & Vendeur -->
    <div class="flex items-center gap-3 md:gap-6 lg:gap-8">
      <!-- Date/Heure - masqué sur très petit écran -->
      <div class="text-right hidden sm:block">
        <p class="text-[10px] md:text-xs text-gray-400 mb-0.5 md:mb-1">{{ currentDate }}</p>
        <p class="text-base md:text-xl font-mono font-medium tabular-nums">{{ currentTime }}</p>
      </div>
      
      <!-- Switch thème -->
      <button
        @click="toggleTheme"
        class="hidden sm:inline-flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
        :title="isDark ? 'Passer en thème clair' : 'Passer en thème sombre'"
        aria-label="Basculer le thème"
      >
        <Sun v-if="isDark" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </button>

      <div class="w-px h-8 md:h-10 bg-gray-700 hidden sm:block"></div>
      
      <!-- Compte utilisateur + déconnexion -->
      <div class="relative">
        <button
          @click="showUserMenu = !showUserMenu"
          class="flex items-center gap-2 md:gap-3 px-2 py-1.5 md:px-4 md:py-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <div 
            :style="{ backgroundColor: currentVendor?.color || '#10B981' }"
            class="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ring-2 ring-gray-600 font-semibold text-sm md:text-base text-white"
          >
            {{ currentVendor?.initials || (user?.email?.[0]?.toUpperCase() ?? '?') }}
          </div>
          <div class="text-left hidden md:block">
            <p class="text-sm font-medium leading-tight">{{ currentVendor ? `${currentVendor.first_name} ${currentVendor.last_name}` : user?.email }}</p>
            <p class="text-xs text-emerald-400 mt-0.5">● Connecté</p>
          </div>
          <ChevronDown class="w-4 h-4 text-gray-400" />
        </button>

        <!-- Menu déroulant : déconnexion -->
        <Transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="showUserMenu"
            class="absolute right-0 top-full mt-2 w-56 md:w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50"
          >
            <button
              @click="handleSignOut"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-red-600 dark:text-red-400"
            >
              <LogOut class="w-5 h-5" />
              <span class="text-sm font-medium">Se déconnecter</span>
            </button>
          </div>
        </Transition>

        <!-- Backdrop pour fermer le menu -->
        <div
          v-if="showUserMenu"
          @click="showUserMenu = false"
          class="fixed inset-0 z-40"
        ></div>
      </div>
    </div>

    <!-- Backdrop menus dropdown -->
    <div
      v-if="openDropdown"
      @click="closeDropdowns"
      class="fixed inset-0 z-30"
    ></div>
  </header>
</template>
