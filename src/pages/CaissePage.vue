<script setup lang="ts">
import { ref } from 'vue';
import { LayoutGrid, ShoppingCart, User } from 'lucide-vue-next';
import TicketPanel from '../components/TicketPanel.vue';
import ServiceGrid from '../components/ServiceGrid.vue';
import ClientPanel from '../components/ClientPanel.vue';

// Navigation mobile
type MobileTab = 'services' | 'ticket' | 'client';
const activeTab = ref<MobileTab>('services');

const tabs = [
  { id: 'services' as const, label: 'Services', icon: LayoutGrid },
  { id: 'ticket' as const, label: 'Ticket', icon: ShoppingCart },
  { id: 'client' as const, label: 'Client', icon: User },
];
</script>

<template class="unzoom">
  <!-- Main content -->
  <!-- Desktop: 3 colonnes | Tablette: 2 colonnes | Mobile: 1 colonne avec onglets -->
  <main class="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:gap-6 lg:p-6 pb-20 lg:pb-6">
    
    <!-- Colonne gauche : Ticket (visible sur tablette/desktop, masqué sur mobile sauf si onglet actif) -->
    <aside 
      :class="[
        'lg:w-80 lg:flex-shrink-0',
        activeTab === 'ticket' ? 'block' : 'hidden lg:block'
      ]"
    >
      <TicketPanel />
    </aside>

    <!-- Colonne centrale : Services -->
    <section 
      :class="[
        'flex-1 min-w-0',
        activeTab === 'services' ? 'block' : 'hidden lg:block'
      ]"
    >
      <ServiceGrid />
    </section>

    <!-- Colonne droite : Client (visible sur desktop, masqué sur tablette/mobile sauf si onglet actif) -->
    <aside 
      :class="[
        'lg:w-80 xl:w-96 lg:flex-shrink-0',
        activeTab === 'client' ? 'block' : 'hidden lg:block'
      ]"
    >
      <ClientPanel />
    </aside>
  </main>

  <!-- Navigation mobile (visible uniquement sur mobile/tablette) -->
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
    <div class="flex">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="[
          'flex-1 flex flex-col items-center justify-center py-3 transition-colors',
          activeTab === tab.id 
            ? 'text-gray-900 bg-gray-100 dark:text-gray-100 dark:bg-gray-700' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/70'
        ]"
      >
        <component :is="tab.icon" class="w-5 h-5 mb-1" />
        <span class="text-xs font-medium">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>
