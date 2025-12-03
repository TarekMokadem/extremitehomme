<script setup lang="ts">
import AppHeader from './components/AppHeader.vue';
import TicketPanel from './components/TicketPanel.vue';
import ServiceGrid from './components/ServiceGrid.vue';
import ClientPanel from './components/ClientPanel.vue';
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-gray-50">
    <!-- Header -->
    <AppHeader />

    <!-- Main content - 3 colonnes avec meilleurs espacements -->
    <main class="flex-1 flex gap-6 p-6 min-h-0">
      <!-- Colonne gauche : Ticket & Paiement -->
      <aside class="w-80 flex-shrink-0">
        <TicketPanel />
      </aside>

      <!-- Colonne centrale : Services -->
      <section class="flex-1 min-w-0">
        <ServiceGrid />
      </section>

      <!-- Colonne droite : Client -->
      <aside class="w-96 flex-shrink-0">
        <ClientPanel />
      </aside>
    </main>
  </div>
</template>
