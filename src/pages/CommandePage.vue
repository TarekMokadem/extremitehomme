<script setup lang="ts">
import { ClipboardList } from 'lucide-vue-next';
</script>

<template>
  <main class="flex-1 p-4 lg:p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
    <div class="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div class="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-6">
        <ClipboardList class="w-10 h-10 text-gray-500 dark:text-gray-400" />
      </div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Commande</h1>
      <p class="text-gray-500 dark:text-gray-400 mb-6">
        Cette rubrique sera implémentée prochainement.
      </p>
    </div>
  </main>
</template>
