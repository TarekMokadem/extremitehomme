<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Settings, Building2, Percent, FileText, Save, RefreshCw } from 'lucide-vue-next';
import {
  useSettings,
  type SalonInfo,
  type TvaRates,
  type TicketLines,
} from '../composables/useSettings';
import { formatPhoneFR, formatSiret, INPUT_LENGTHS } from '../utils/formatInputs';

const {
  loadSettings,
  saveSetting,
  salonInfo,
  tvaRates,
  ticketHeader,
  ticketFooter,
  isLoading,
  isSaving,
} = useSettings();

// Copies locales pour édition
const salon = reactive<SalonInfo>({
  name: '',
  address: '',
  phone: '',
  siret: '',
});

const tva = reactive<TvaRates>({
  normal: 0.2,
  reduced: 0.1,
  super_reduced: 0.055,
});

const header = reactive<TicketLines>({
  line1: '',
  line2: '',
  line3: '',
});

const footer = reactive<TicketLines>({
  line1: '',
  line2: '',
});

const saveSuccess = ref(false);
const saveError = ref('');

function syncFromStore() {
  salon.name = salonInfo.value.name;
  salon.address = salonInfo.value.address;
  salon.phone = formatPhoneFR(salonInfo.value.phone || '');
  salon.siret = formatSiret(salonInfo.value.siret || '');

  tva.normal = tvaRates.value.normal;
  tva.reduced = tvaRates.value.reduced;
  tva.super_reduced = tvaRates.value.super_reduced;

  header.line1 = ticketHeader.value.line1;
  header.line2 = ticketHeader.value.line2 ?? '';
  header.line3 = ticketHeader.value.line3 ?? '';

  footer.line1 = ticketFooter.value.line1;
  footer.line2 = ticketFooter.value.line2 ?? '';
}

async function saveSalon() {
  saveError.value = '';
  saveSuccess.value = false;
  try {
    await saveSetting('salon_info', { ...salon });
    saveSuccess.value = true;
    setTimeout(() => (saveSuccess.value = false), 2500);
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement';
  }
}

async function saveTva() {
  saveError.value = '';
  saveSuccess.value = false;
  try {
    await saveSetting('tva_rates', { ...tva });
    saveSuccess.value = true;
    setTimeout(() => (saveSuccess.value = false), 2500);
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement';
  }
}

async function saveTicket() {
  saveError.value = '';
  saveSuccess.value = false;
  try {
    await saveSetting('ticket_header', { line1: header.line1, line2: header.line2, line3: header.line3 });
    await saveSetting('ticket_footer', { line1: footer.line1, line2: footer.line2 });
    saveSuccess.value = true;
    setTimeout(() => (saveSuccess.value = false), 2500);
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement';
  }
}

onMounted(async () => {
  await loadSettings();
  syncFromStore();
});
</script>

<template>
  <main class="flex-1 p-4 lg:p-6 overflow-auto bg-gray-50">
    <div class="max-w-2xl mx-auto space-y-6">
      <!-- En-tête -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings class="w-7 h-7 text-gray-600" />
            Paramètres
          </h1>
          <p class="text-sm text-gray-500 mt-1">Informations du commerce et des tickets</p>
        </div>
        <button
          @click="loadSettings(); syncFromStore()"
          :disabled="isLoading"
          class="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw :class="['w-4 h-4', isLoading && 'animate-spin']" />
          Actualiser
        </button>
      </div>

      <div v-if="isLoading" class="flex justify-center py-12">
        <RefreshCw class="w-8 h-8 text-gray-400 animate-spin" />
      </div>

      <template v-else>
        <p v-if="saveError" class="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">
          {{ saveError }}
        </p>
        <p v-if="saveSuccess" class="text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">
          Paramètres enregistrés.
        </p>

        <!-- Informations du salon -->
        <section class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <Building2 class="w-5 h-5 text-gray-600" />
            <h2 class="font-semibold text-gray-900">Informations du salon</h2>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nom du commerce</label>
              <input
                v-model="salon.name"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Extrémités Homme"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                v-model="salon.address"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="123 rue Example"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                :value="salon.phone"
                type="tel"
                inputmode="numeric"
                autocomplete="tel"
                :maxlength="INPUT_LENGTHS.phone"
                placeholder="01 23 45 67 89"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                @input="salon.phone = formatPhoneFR(($event.target as HTMLInputElement).value)"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
              <input
                :value="salon.siret"
                type="text"
                inputmode="numeric"
                :maxlength="INPUT_LENGTHS.siret"
                placeholder="123 456 789 00012"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                @input="salon.siret = formatSiret(($event.target as HTMLInputElement).value)"
              />
            </div>
            <button
              @click="saveSalon"
              :disabled="isSaving"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50"
            >
              <Save class="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </section>

        <!-- Taux de TVA -->
        <section class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <Percent class="w-5 h-5 text-gray-600" />
            <h2 class="font-semibold text-gray-900">Taux de TVA</h2>
          </div>
          <div class="p-5 space-y-4">
            <p class="text-sm text-gray-500">
              Ces taux sont utilisés pour l’affichage et les calculs. Le taux normal s’applique par défaut aux services.
            </p>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Taux normal (%)</label>
              <input
                v-model.number="tva.normal"
                type="number"
                min="0"
                max="1"
                step="0.01"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p class="text-xs text-gray-500 mt-1">Ex. 0,20 pour 20 %</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Taux réduit (%)</label>
              <input
                v-model.number="tva.reduced"
                type="number"
                min="0"
                max="1"
                step="0.01"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p class="text-xs text-gray-500 mt-1">Ex. 0,10 pour 10 %</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Taux super réduit (%)</label>
              <input
                v-model.number="tva.super_reduced"
                type="number"
                min="0"
                max="1"
                step="0.01"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p class="text-xs text-gray-500 mt-1">Ex. 0,055 pour 5,5 %</p>
            </div>
            <button
              @click="saveTva"
              :disabled="isSaving"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50"
            >
              <Save class="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </section>

        <!-- Ticket : en-tête et pied de page -->
        <section class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <FileText class="w-5 h-5 text-gray-600" />
            <h2 class="font-semibold text-gray-900">Ticket — En-tête et pied de page</h2>
          </div>
          <div class="p-5 space-y-4">
            <p class="text-sm text-gray-500">
              Texte affiché en haut et en bas du ticket (impression ou aperçu).
            </p>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">En-tête — Ligne 1</label>
              <input
                v-model="header.line1"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Nom du salon"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">En-tête — Ligne 2</label>
              <input
                v-model="header.line2"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Adresse ou téléphone"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">En-tête — Ligne 3</label>
              <input
                v-model="header.line3"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="SIRET ou autre"
              />
            </div>
            <div class="pt-2 border-t border-gray-100">
              <label class="block text-sm font-medium text-gray-700 mb-1">Pied de page — Ligne 1</label>
              <input
                v-model="footer.line1"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Merci de votre visite !"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Pied de page — Ligne 2</label>
              <input
                v-model="footer.line2"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder=""
              />
            </div>
            <button
              @click="saveTicket"
              :disabled="isSaving"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50"
            >
              <Save class="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>
