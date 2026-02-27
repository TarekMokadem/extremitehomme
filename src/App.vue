<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import { useProducts } from './composables/useProducts';
import { useAuth } from './composables/useAuth';

// Router
const router = useRouter();

// Composables
const { loadProducts, loadCategories } = useProducts();
const { checkSession, isAuthenticated } = useAuth();

// State
const isLoading = ref(true);

// Redirection quand la session expire (timeout d'inactivité)
const onSessionExpired = () => {
  router.replace({ path: '/login', query: { expired: '1' } });
};

onMounted(async () => {
  window.addEventListener('session-expired', onSessionExpired);

  try {
    await checkSession();
    await Promise.all([
      loadCategories(),
      loadProducts(),
    ]);
  } catch (error) {
    console.error('Erreur initialisation:', error);
  } finally {
    isLoading.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener('session-expired', onSessionExpired);
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
    <!-- Header avec navigation (masqué à l'impression et sur la page login) -->
    <AppHeader v-if="isAuthenticated" class="print:hidden" />

    <!-- Contenu de la page (router) -->
    <router-view class="flex-1 min-h-0" />
  </div>
</template>
