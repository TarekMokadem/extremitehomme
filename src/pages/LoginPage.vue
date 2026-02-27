<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Scissors, Lock, Mail } from 'lucide-vue-next';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const route = useRoute();
const { signIn, isLoading } = useAuth();

const form = reactive({
  email: '',
  password: '',
});

const localError = ref<string | null>(null);
const sessionExpiredMessage = ref(false);

onMounted(() => {
  sessionExpiredMessage.value = route.query.expired === '1';
});

async function handleSubmit() {
  localError.value = null;
  sessionExpiredMessage.value = false;
  if (!form.email.trim()) {
    localError.value = 'Veuillez saisir votre email.';
    return;
  }
  if (!form.password) {
    localError.value = 'Veuillez saisir votre mot de passe.';
    return;
  }

  const result = await signIn(form.email.trim(), form.password);

  if (result.success) {
    const redirect = (route.query.redirect as string) || '/';
    router.replace(redirect);
  } else {
    localError.value = result.error || 'Identifiants incorrects.';
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 rounded-2xl bg-gray-900 dark:bg-emerald-600 flex items-center justify-center mb-4">
          <Scissors class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">EXTRÉMITÉS HOMMES</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Chausseur · Coiffeur · Barbier</p>
      </div>

      <!-- Formulaire -->
      <form
        @submit.prevent="handleSubmit"
        class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4"
      >
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Connexion</h2>

        <p
          v-if="sessionExpiredMessage"
          class="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-xl"
        >
          Session expirée. Veuillez vous reconnecter.
        </p>
        <p
          v-else-if="localError"
          class="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl"
        >
          {{ localError }}
        </p>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <div class="relative">
            <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              v-model="form.email"
              type="email"
              autocomplete="email"
              placeholder="votre@email.fr"
              class="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mot de passe</label>
          <div class="relative">
            <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full py-3 px-4 bg-gray-900 dark:bg-emerald-600 hover:bg-gray-800 dark:hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isLoading ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>
    </div>
  </div>
</template>
