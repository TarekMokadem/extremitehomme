<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Calculator, Printer, RefreshCw, ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronUp } from 'lucide-vue-next';
import { useFinDeJournee } from '../composables/useFinDeJournee';

const {
  selectedDate,
  isLoading,
  paymentModeRows,
  categoryRows,
  cashMovements,
  journalRows,
  fondDeCaisse,
  caisseTotal,
  totalCA,
  totalVentes,
  panierMoyen,
  loadData,
} = useFinDeJournee();

watch(selectedDate, () => loadData());
onMounted(() => loadData());

const formatPrice = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const journalExpanded = ref(true);

const handlePrint = () => {
  window.print();
};
</script>

<template>
  <main class="flex-1 p-4 lg:p-6 overflow-auto bg-gray-50 dark:bg-gray-900 print:bg-white print:p-4">
    <div class="max-w-5xl mx-auto space-y-6 print:max-w-none">
      <!-- En-tête -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:flex-row">
        <h1 class="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white print:text-black">
          Fin de journée {{ formatDate(selectedDate) }}
        </h1>
        <div class="flex items-center gap-3 print:hidden">
          <label class="text-sm text-gray-600 dark:text-gray-400">date :</label>
          <input
            v-model="selectedDate"
            type="date"
            class="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
          />
          <button
            @click="loadData"
            :disabled="isLoading"
            class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
          >
            <RefreshCw :class="['w-4 h-4', isLoading && 'animate-spin']" />
            Calculer
          </button>
          <button
            @click="handlePrint"
            class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-emerald-600 text-white rounded-xl hover:bg-gray-800"
          >
            <Printer class="w-4 h-4" />
            Imprimer
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="flex justify-center py-12">
        <RefreshCw class="w-8 h-8 text-gray-400 animate-spin" />
      </div>

      <template v-else>
        <!-- Tableaux récap -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
          <!-- Mode règlement -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden print:rounded-none print:border print:shadow-none">
            <div class="px-4 py-3 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Mode règlement</h2>
            </div>
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-600">
                  <th class="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Mode règlement</th>
                  <th class="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">CA</th>
                  <th class="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Nb</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="row in paymentModeRows" :key="row.method" class="text-gray-900 dark:text-gray-100">
                  <td class="px-4 py-2">{{ row.label }}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ formatPrice(row.ca) }} €</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ row.nb }}</td>
                </tr>
                <tr v-if="paymentModeRows.length > 0" class="font-bold bg-gray-50 dark:bg-gray-700/50">
                  <td class="px-4 py-2">Total</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ formatPrice(totalCA) }} €</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ totalVentes }}</td>
                </tr>
                <tr class="border-t-2 border-gray-200 dark:border-gray-600">
                  <td class="px-4 py-2 font-medium">Fond de caisse</td>
                  <td class="px-4 py-2 text-right tabular-nums" colspan="2">{{ formatPrice(fondDeCaisse) }} €</td>
                </tr>
                <!-- Libellés tiroir (entrée/sortie) -->
                <tr v-for="m in cashMovements" :key="m.createdAt + m.label" class="text-gray-600 dark:text-gray-400">
                  <td class="px-4 py-1 pl-8 text-sm">
                    <span class="inline-flex items-center gap-1">
                      <ArrowDownCircle v-if="m.type === 'in'" class="w-3.5 h-3.5 text-emerald-500" />
                      <ArrowUpCircle v-else class="w-3.5 h-3.5 text-red-500" />
                      {{ m.type === 'in' ? 'Entrée' : 'Sortie' }} — {{ m.label }}
                    </span>
                  </td>
                  <td class="px-4 py-1 text-right tabular-nums" :class="m.type === 'in' ? 'text-emerald-600' : 'text-red-600'" colspan="2">
                    {{ m.type === 'in' ? '+' : '-' }}{{ formatPrice(m.amount) }} €
                  </td>
                </tr>
                <tr class="border-t border-gray-200 dark:border-gray-600">
                  <td class="px-4 py-2 font-medium">Caisse</td>
                  <td class="px-4 py-2 text-right tabular-nums font-semibold" colspan="2">{{ formatPrice(caisseTotal) }} €</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Catégorie -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden print:rounded-none print:border print:shadow-none">
            <div class="px-4 py-3 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Catégorie</h2>
            </div>
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-600">
                  <th class="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Catégorie</th>
                  <th class="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">CA</th>
                  <th class="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Nb</th>
                  <th class="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Réduction</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="row in categoryRows" :key="row.category" class="text-gray-900 dark:text-gray-100">
                  <td class="px-4 py-2">{{ row.category }}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ formatPrice(row.ca) }} €</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ row.nb }}</td>
                  <td class="px-4 py-2 text-right tabular-nums text-gray-600 dark:text-gray-400">
                    {{ formatPrice(row.reduction) }} € ({{ row.reductionPct.toFixed(2) }}%)
                  </td>
                </tr>
                <tr v-if="categoryRows.length > 0" class="font-bold bg-gray-50 dark:bg-gray-700/50 border-t-2">
                  <td class="px-4 py-2">Total</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ formatPrice(categoryRows.reduce((s, r) => s + r.ca, 0)) }} €</td>
                  <td class="px-4 py-2 text-right tabular-nums">—</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ formatPrice(categoryRows.reduce((s, r) => s + r.reduction, 0)) }} €</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Stats résumé -->
        <div class="grid grid-cols-3 gap-4 print:grid-cols-3">
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 print:rounded-none">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</p>
            <p class="text-xl font-bold text-gray-900 dark:text-white print:text-black">{{ formatPrice(totalCA) }} €</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 print:rounded-none">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ventes</p>
            <p class="text-xl font-bold text-gray-900 dark:text-white print:text-black">{{ totalVentes }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 print:rounded-none">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Panier moyen</p>
            <p class="text-xl font-bold text-gray-900 dark:text-white print:text-black">{{ formatPrice(panierMoyen) }} €</p>
          </div>
        </div>

        <!-- Journal des ventes (masqué à l'impression) -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden print:rounded-none print:border print:shadow-none print:hidden">
          <button
            type="button"
            @click="journalExpanded = !journalExpanded"
            class="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors print:pointer-events-none"
          >
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Journal des ventes</h2>
            <span class="text-gray-500 dark:text-gray-400 print:hidden">
              <ChevronUp v-if="journalExpanded" class="w-5 h-5" />
              <ChevronDown v-else class="w-5 h-5" />
            </span>
          </button>
          <div v-show="journalExpanded" class="journal-content overflow-x-auto print-thermal-compact">
            <table class="w-full text-sm min-w-[700px]">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-600">
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">N° transaction</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Heure</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Service/Produit</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Taille</th>
                  <th class="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Montant</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Vendeur</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Paiement</th>
                  <th class="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Client</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="(row, i) in journalRows" :key="i" class="text-gray-900 dark:text-gray-100">
                  <td class="px-3 py-2 font-mono text-xs">{{ row.ticketNumber }}</td>
                  <td class="px-3 py-2 tabular-nums">{{ row.saleTime }}</td>
                  <td class="px-3 py-2">{{ row.productName }}</td>
                  <td class="px-3 py-2">{{ row.size || '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums">{{ formatPrice(row.amount) }} €</td>
                  <td class="px-3 py-2">{{ row.vendorName }}</td>
                  <td class="px-3 py-2">{{ row.paymentMethod }}</td>
                  <td class="px-3 py-2">{{ row.clientName || '—' }}</td>
                </tr>
              </tbody>
            </table>
          <p v-if="journalRows.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-400">Aucune vente ce jour</p>
          </div>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
@media print {
  @page { size: 80mm 297mm; margin: 2mm; }
  body, html { width: 80mm !important; }
  main { padding: 0 !important; font-size: 9px !important; }

  * { color: black !important; background: white !important; border-color: #ddd !important; }

  .rounded-xl, .rounded-2xl { border-radius: 0 !important; }
  .shadow, .shadow-sm, .shadow-lg { box-shadow: none !important; }

  table { font-size: 8px !important; width: 100% !important; }
  th, td { padding: 1px 2px !important; }
  table .min-w-\[700px\] { min-width: 0 !important; }

  .journal-content { display: block !important; overflow: visible !important; }
  .journal-content table { min-width: 0 !important; }
  .print\:hidden { display: none !important; }
  .print\:bg-white { background: white !important; }
  .print\:text-black { color: black !important; }
  .print\:rounded-none { border-radius: 0 !important; }
  .print\:border { border: 1px solid #ddd !important; }
  .print\:shadow-none { box-shadow: none !important; }
  .print\:max-w-none { max-width: none !important; }
  .print\:flex-row { flex-direction: row !important; }

  .print\:grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
  .print\:grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; }

  .max-w-5xl { max-width: none !important; }
  .space-y-6 > * + * { margin-top: 4px !important; }
  .gap-6 { gap: 4px !important; }
  .gap-4 { gap: 2px !important; }

  h1 { font-size: 11px !important; text-align: center !important; }
  h2 { font-size: 9px !important; }
  .px-4 { padding-left: 2px !important; padding-right: 2px !important; }
  .py-3 { padding-top: 1px !important; padding-bottom: 1px !important; }
  .py-2 { padding-top: 1px !important; padding-bottom: 1px !important; }
  .p-4 { padding: 2px !important; }

  .grid-cols-3 .text-xl { font-size: 10px !important; }
  .grid-cols-3 .text-xs { font-size: 7px !important; }
  .grid-cols-3 .p-4 { padding: 2px !important; }
}
</style>
