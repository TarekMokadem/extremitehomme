<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RefreshCw, Printer, Calculator } from 'lucide-vue-next';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { PaymentMethod } from '../types/database';

interface PaymentAgg {
  montant: number;
  nb: number;
}

interface DayRow {
  date: string;
  amex: PaymentAgg;
  cb: PaymentAgg;
  cheque: PaymentAgg;
  especes: PaymentAgg;
  sansContact: PaymentAgg;
  ca: PaymentAgg;
  chequesCadeau: PaymentAgg;
  gratuit: PaymentAgg;
  fondCaisse: number;
  depenses: number;
  remiseMontant: number;
  remisePct: number;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const isLoading = ref(false);
const rows = ref<DayRow[]>([]);

const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth());
const periodMode = ref<'month' | 'custom'>('month');
const customFrom = ref('');
const customTo = ref('');

const availableYears = computed(() => {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= current - 5; y--) years.push(y);
  return years;
});

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const d = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (d <= last) {
    days.push(d.toISOString().split('T')[0]!);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getMonthRange(): { startDate: string; endDate: string } {
  const y = selectedYear.value;
  const m = selectedMonth.value;
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return {
    startDate: first.toISOString().split('T')[0]!,
    endDate: last.toISOString().split('T')[0]!,
  };
}

function getDateRange(): { startDate: string; endDate: string } | null {
  if (periodMode.value === 'custom') {
    if (!customFrom.value || !customTo.value) return null;
    return { startDate: customFrom.value, endDate: customTo.value };
  }
  return getMonthRange();
}

const totals = computed<DayRow>(() => {
  const t: DayRow = {
    date: 'Totaux',
    amex: { montant: 0, nb: 0 },
    cb: { montant: 0, nb: 0 },
    cheque: { montant: 0, nb: 0 },
    especes: { montant: 0, nb: 0 },
    sansContact: { montant: 0, nb: 0 },
    ca: { montant: 0, nb: 0 },
    chequesCadeau: { montant: 0, nb: 0 },
    gratuit: { montant: 0, nb: 0 },
    fondCaisse: 0,
    depenses: 0,
    remiseMontant: 0,
    remisePct: 0,
  };
  for (const r of rows.value) {
    t.amex.montant += r.amex.montant;
    t.amex.nb += r.amex.nb;
    t.cb.montant += r.cb.montant;
    t.cb.nb += r.cb.nb;
    t.cheque.montant += r.cheque.montant;
    t.cheque.nb += r.cheque.nb;
    t.especes.montant += r.especes.montant;
    t.especes.nb += r.especes.nb;
    t.sansContact.montant += r.sansContact.montant;
    t.sansContact.nb += r.sansContact.nb;
    t.ca.montant += r.ca.montant;
    t.ca.nb += r.ca.nb;
    t.chequesCadeau.montant += r.chequesCadeau.montant;
    t.chequesCadeau.nb += r.chequesCadeau.nb;
    t.gratuit.montant += r.gratuit.montant;
    t.gratuit.nb += r.gratuit.nb;
    t.fondCaisse += r.fondCaisse;
    t.depenses += r.depenses;
    t.remiseMontant += r.remiseMontant;
  }
  t.remisePct = t.ca.montant > 0 ? (t.remiseMontant / t.ca.montant) * 100 : 0;
  return t;
});

function formatDateFr(dateStr: string): string {
  if (dateStr === 'Totaux') return 'Totaux';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y!.slice(2)}`;
}

function formatPrice(n: number): string {
  const parts = Math.abs(n).toFixed(2).split('.');
  const intPart = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (n < 0 ? '-' : '') + intPart + ',' + parts[1];
}

function mapMethodToKey(method: PaymentMethod): keyof Pick<DayRow, 'amex' | 'cb' | 'cheque' | 'especes' | 'sansContact' | 'chequesCadeau' | 'gratuit'> | null {
  switch (method) {
    case 'amex': return 'amex';
    case 'card': return 'cb';
    case 'check': return 'cheque';
    case 'cash': return 'especes';
    case 'contactless': return 'sansContact';
    case 'gift_card': return 'chequesCadeau';
    case 'free': return 'gratuit';
    case 'technical': return 'gratuit';
    default: return null;
  }
}

const loadData = async () => {
  const range = getDateRange();
  if (!range || !isSupabaseConfigured()) return;

  isLoading.value = true;
  try {
    const { startDate, endDate } = range;
    const days = getDaysInRange(startDate, endDate);

    const dayMap = new Map<string, DayRow>();
    for (const day of days) {
      dayMap.set(day, {
        date: day,
        amex: { montant: 0, nb: 0 },
        cb: { montant: 0, nb: 0 },
        cheque: { montant: 0, nb: 0 },
        especes: { montant: 0, nb: 0 },
        sansContact: { montant: 0, nb: 0 },
        ca: { montant: 0, nb: 0 },
        chequesCadeau: { montant: 0, nb: 0 },
        gratuit: { montant: 0, nb: 0 },
        fondCaisse: 0,
        depenses: 0,
        remiseMontant: 0,
        remisePct: 0,
      });
    }

    const { data: salesData } = await supabase
      .from('sales')
      .select('id, total, discount_amount, created_at, payments:payments(method, amount)')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .eq('status', 'completed')
      .order('created_at');

    if (salesData) {
      const saleCountPerDay = new Map<string, Set<string>>();

      for (const sale of salesData as any[]) {
        const saleDate = sale.created_at.split('T')[0] as string;
        const row = dayMap.get(saleDate);
        if (!row) continue;

        if (!saleCountPerDay.has(saleDate)) saleCountPerDay.set(saleDate, new Set());
        saleCountPerDay.get(saleDate)!.add(sale.id);

        row.ca.montant += sale.total;
        row.remiseMontant += sale.discount_amount ?? 0;

        if (sale.payments) {
          for (const p of sale.payments) {
            const key = mapMethodToKey(p.method as PaymentMethod);
            if (key) {
              (row[key] as PaymentAgg).montant += p.amount;
              (row[key] as PaymentAgg).nb += 1;
            }
          }
        }
      }

      for (const [day, ids] of saleCountPerDay) {
        const row = dayMap.get(day);
        if (row) row.ca.nb = ids.size;
      }
    }

    const { data: registers } = await supabase
      .from('cash_registers')
      .select('date, opening_amount, closing_amount')
      .gte('date', startDate)
      .lte('date', endDate);

    if (registers) {
      for (const reg of registers) {
        const row = dayMap.get(reg.date);
        if (row) {
          row.fondCaisse = reg.closing_amount ?? reg.opening_amount ?? 0;
        }
      }
    }

    const { data: cashMovements } = await supabase
      .from('cash_movements')
      .select('amount, created_at, cash_register_id')
      .eq('type', 'out');

    if (cashMovements) {
      for (const mov of cashMovements as any[]) {
        const movDate = mov.created_at?.split('T')[0] as string | undefined;
        if (!movDate) continue;
        const row = dayMap.get(movDate);
        if (row) row.depenses += mov.amount;
      }
    }

    for (const row of dayMap.values()) {
      row.remisePct = row.ca.montant > 0 ? (row.remiseMontant / row.ca.montant) * 100 : 0;
    }

    const hasData = (r: DayRow) =>
      r.ca.montant > 0 || r.depenses > 0 || r.fondCaisse > 0 ||
      r.amex.montant > 0 || r.cb.montant > 0 || r.cheque.montant > 0 ||
      r.especes.montant > 0 || r.sansContact.montant > 0 ||
      r.chequesCadeau.montant > 0 || r.gratuit.montant > 0;
    rows.value = days.map(d => dayMap.get(d)!).filter(hasData);
  } catch (err) {
    console.error('Erreur chargement CA:', err);
    rows.value = [];
  } finally {
    isLoading.value = false;
  }
};

const selectMonth = (m: number) => {
  selectedMonth.value = m;
  periodMode.value = 'month';
};

const handlePrint = () => window.print();

onMounted(loadData);
</script>

<template>
  <main class="flex-1 p-4 lg:p-6 overflow-auto bg-gray-50 dark:bg-gray-900 print:bg-white print:p-2">
    <div class="max-w-[1600px] mx-auto space-y-6 print:max-w-none print:space-y-3">

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 class="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Chiffre d'affaires</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Tableau récapitulatif par jour et mode de règlement</p>
        </div>
        <button
          @click="handlePrint"
          class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-emerald-600 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-emerald-500 transition-colors"
        >
          <Printer class="w-4 h-4" />
          Imprimer
        </button>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4 print:hidden">
        <div class="flex flex-wrap items-center gap-3">
          <select
            v-model.number="selectedYear"
            class="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-emerald-500/30"
          >
            <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
          </select>

          <div class="flex flex-wrap gap-1">
            <button
              v-for="(name, i) in MONTH_NAMES"
              :key="i"
              @click="selectMonth(i)"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                periodMode === 'month' && selectedMonth === i
                  ? 'bg-gray-900 dark:bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              ]"
            >
              {{ name.slice(0, 4) }}
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            @click="periodMode = 'custom'"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              periodMode === 'custom'
                ? 'bg-gray-900 dark:bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            ]"
          >
            Période personnalisée
          </button>
          <template v-if="periodMode === 'custom'">
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-600 dark:text-gray-400">Du</label>
              <input
                v-model="customFrom"
                type="date"
                class="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-gray-100"
              />
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-600 dark:text-gray-400">Au</label>
              <input
                v-model="customTo"
                type="date"
                class="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-gray-100"
              />
            </div>
          </template>
          <button
            @click="loadData"
            :disabled="isLoading"
            class="inline-flex items-center gap-2 px-5 py-2 bg-gray-900 dark:bg-emerald-600 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-emerald-500 transition-colors disabled:opacity-50 font-medium"
          >
            <Calculator v-if="!isLoading" class="w-4 h-4" />
            <RefreshCw v-else class="w-4 h-4 animate-spin" />
            Calculer
          </button>
        </div>
      </div>

      <h2 class="hidden print:block text-lg font-bold text-black text-center">
        Chiffre d'affaires —
        <template v-if="periodMode === 'month'">{{ MONTH_NAMES[selectedMonth] }} {{ selectedYear }}</template>
        <template v-else>{{ customFrom }} au {{ customTo }}</template>
      </h2>

      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <RefreshCw class="w-8 h-8 text-gray-400 animate-spin" />
      </div>

      <div v-else-if="rows.length === 0" class="text-center py-16 text-gray-500 dark:text-gray-400">
        Sélectionnez une période et cliquez sur « Calculer »
      </div>

      <div v-else class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden print:rounded-none print:border print:shadow-none">
        <div class="overflow-x-auto">
          <table class="w-full text-xs whitespace-nowrap">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <th rowspan="2" class="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-100 dark:bg-gray-700 z-10 border-r border-gray-200 dark:border-gray-600">Date</th>
                <th colspan="2" class="px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 border-x border-gray-200 dark:border-gray-600">Amex</th>
                <th colspan="2" class="px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 border-x border-gray-200 dark:border-gray-600">CB</th>
                <th colspan="2" class="px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 border-x border-gray-200 dark:border-gray-600">Chèque</th>
                <th colspan="2" class="px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 border-x border-gray-200 dark:border-gray-600">Espèces</th>
                <th colspan="2" class="px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 border-x border-gray-200 dark:border-gray-600">Sans contact</th>
                <th colspan="2" class="px-2 py-1 text-center font-bold text-blue-700 dark:text-blue-400 border-x-2 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20">CA</th>
                <th colspan="2" class="px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 border-x border-gray-200 dark:border-gray-600">Chq. cadeau</th>
                <th colspan="2" class="px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 border-x border-gray-200 dark:border-gray-600">Gratuit</th>
                <th rowspan="2" class="px-2 py-2 text-right font-semibold text-gray-700 dark:text-gray-300 border-x border-gray-200 dark:border-gray-600">Fond caisse</th>
                <th rowspan="2" class="px-2 py-2 text-right font-semibold text-gray-700 dark:text-gray-300 border-x border-gray-200 dark:border-gray-600">Dépenses</th>
                <th rowspan="2" class="px-2 py-2 text-right font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-600">Remise</th>
              </tr>
              <tr class="bg-gray-50 dark:bg-gray-700/70 border-b border-gray-200 dark:border-gray-600">
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-600">€</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">nb</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400">€</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">nb</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400">€</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">nb</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400">€</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">nb</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400">€</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">nb</th>
                <th class="px-2 py-1 text-right font-bold text-blue-600 dark:text-blue-400 border-l-2 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20">€</th>
                <th class="px-2 py-1 text-right font-bold text-blue-600 dark:text-blue-400 border-r-2 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20">nb</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400">€</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">nb</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400">€</th>
                <th class="px-2 py-1 text-right font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">nb</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
              <tr
                v-for="row in rows"
                :key="row.date"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors text-gray-900 dark:text-gray-100"
              >
                <td class="px-2 py-1.5 font-medium tabular-nums sticky left-0 bg-white dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-600">{{ formatDateFr(row.date) }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums border-l border-gray-100 dark:border-gray-700">{{ row.amex.montant ? formatPrice(row.amex.montant) : '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700">{{ row.amex.nb || '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums">{{ row.cb.montant ? formatPrice(row.cb.montant) : '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700">{{ row.cb.nb || '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums">{{ row.cheque.montant ? formatPrice(row.cheque.montant) : '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700">{{ row.cheque.nb || '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums">{{ row.especes.montant ? formatPrice(row.especes.montant) : '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700">{{ row.especes.nb || '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums">{{ row.sansContact.montant ? formatPrice(row.sansContact.montant) : '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700">{{ row.sansContact.nb || '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums font-bold text-blue-700 dark:text-blue-400 border-l-2 border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10">{{ row.ca.montant ? formatPrice(row.ca.montant) : '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums font-bold text-blue-700 dark:text-blue-400 border-r-2 border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10">{{ row.ca.nb || '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums">{{ row.chequesCadeau.montant ? formatPrice(row.chequesCadeau.montant) : '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700">{{ row.chequesCadeau.nb || '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums">{{ row.gratuit.montant ? formatPrice(row.gratuit.montant) : '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700">{{ row.gratuit.nb || '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums border-x border-gray-100 dark:border-gray-700">{{ row.fondCaisse ? formatPrice(row.fondCaisse) : '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums border-r border-gray-100 dark:border-gray-700">{{ row.depenses ? formatPrice(row.depenses) : '' }}</td>
                <td class="px-2 py-1.5 text-right tabular-nums">
                  <template v-if="row.remiseMontant">{{ formatPrice(row.remiseMontant) }} ({{ row.remisePct.toFixed(1) }}%)</template>
                </td>
              </tr>

              <tr class="font-bold bg-gray-100 dark:bg-gray-700/60 border-t-2 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white">
                <td class="px-2 py-2 sticky left-0 bg-gray-100 dark:bg-gray-700/60 z-10 border-r border-gray-200 dark:border-gray-600">Totaux</td>
                <td class="px-2 py-2 text-right tabular-nums border-l border-gray-200 dark:border-gray-600">{{ totals.amex.montant ? formatPrice(totals.amex.montant) : '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums border-r border-gray-200 dark:border-gray-600">{{ totals.amex.nb || '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums">{{ totals.cb.montant ? formatPrice(totals.cb.montant) : '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums border-r border-gray-200 dark:border-gray-600">{{ totals.cb.nb || '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums">{{ totals.cheque.montant ? formatPrice(totals.cheque.montant) : '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums border-r border-gray-200 dark:border-gray-600">{{ totals.cheque.nb || '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums">{{ totals.especes.montant ? formatPrice(totals.especes.montant) : '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums border-r border-gray-200 dark:border-gray-600">{{ totals.especes.nb || '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums">{{ totals.sansContact.montant ? formatPrice(totals.sansContact.montant) : '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums border-r border-gray-200 dark:border-gray-600">{{ totals.sansContact.nb || '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums text-blue-700 dark:text-blue-300 border-l-2 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20">{{ totals.ca.montant ? formatPrice(totals.ca.montant) : '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums text-blue-700 dark:text-blue-300 border-r-2 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20">{{ totals.ca.nb || '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums">{{ totals.chequesCadeau.montant ? formatPrice(totals.chequesCadeau.montant) : '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums border-r border-gray-200 dark:border-gray-600">{{ totals.chequesCadeau.nb || '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums">{{ totals.gratuit.montant ? formatPrice(totals.gratuit.montant) : '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums border-r border-gray-200 dark:border-gray-600">{{ totals.gratuit.nb || '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums border-x border-gray-200 dark:border-gray-600">{{ totals.fondCaisse ? formatPrice(totals.fondCaisse) : '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums border-r border-gray-200 dark:border-gray-600">{{ totals.depenses ? formatPrice(totals.depenses) : '' }}</td>
                <td class="px-2 py-2 text-right tabular-nums">
                  <template v-if="totals.remiseMontant">{{ formatPrice(totals.remiseMontant) }} ({{ totals.remisePct.toFixed(1) }}%)</template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
@media print {
  table { font-size: 9px !important; }
  th, td { padding: 2px 4px !important; }
  .print\:hidden { display: none !important; }
  .print\:bg-white { background: white !important; }
  .print\:rounded-none { border-radius: 0 !important; }
  .print\:border { border: 1px solid #e5e7eb !important; }
  .print\:shadow-none { box-shadow: none !important; }
  .print\:max-w-none { max-width: none !important; }
  .print\:block { display: block !important; }
}
</style>
