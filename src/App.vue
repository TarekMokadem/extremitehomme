<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import { useProducts } from './composables/useProducts';
import { useAuth } from './composables/useAuth';
import { isSupabaseConfigured } from './lib/supabase';

// Router
const router = useRouter();
const route = useRoute();

// Composables
const { loadProducts, loadCategories } = useProducts();
const { checkSession } = useAuth();

// State
const isLoading = ref(true);

// Initialisation au démarrage
onMounted(async () => {
  try {
    // Vérifier la session utilisateur
    await checkSession();
    
    // Charger les données
    await Promise.all([
      loadCategories(),
      loadProducts(),
    ]);
    
    if (isSupabaseConfigured()) {
      console.log('✅ Connecté à Supabase');
    } else {
      console.log('⚠️ Mode démo (Supabase non configuré)');
    }
  } catch (error) {
    console.error('Erreur initialisation:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <!-- Header avec navigation -->
    <AppHeader />

    <!-- Contenu de la page (router) -->
    <router-view />
  </div>
</template>
