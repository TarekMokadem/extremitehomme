import { ref, computed } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { PaymentMethod } from '../types/database';

export interface PaymentModeRow {
  method: string;
  label: string;
  ca: number;
  nb: number;
}

export interface CategoryRow {
  category: string;
  ca: number;
  nb: number;
  reduction: number;
  reductionPct: number;
}

export interface CashMovementRow {
  type: 'in' | 'out';
  label: string;
  amount: number;
  createdAt: string;
}

export interface JournalRow {
  ticketNumber: string;
  saleTime: string;
  productName: string;
  size: string | null;
  amount: number;
  vendorName: string;
  paymentMethod: string;
  clientName: string | null;
}

const paymentLabels: Record<string, string> = {
  cash: 'Espèces',
  card: 'CB',
  contactless: 'Sans contact',
  amex: 'American Express',
  check: 'Chèque',
  gift_card: 'Chèque Cadeau',
  free: 'Gratuit',
};

export function useFinDeJournee() {
  const selectedDate = ref(new Date().toISOString().split('T')[0]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const paymentModeRows = ref<PaymentModeRow[]>([]);
  const categoryRows = ref<CategoryRow[]>([]);
  const cashMovements = ref<CashMovementRow[]>([]);
  const journalRows = ref<JournalRow[]>([]);
  const fondDeCaisse = ref(0);
  const caisseTotal = ref(0);

  const loadData = async () => {
    if (!isSupabaseConfigured()) {
      paymentModeRows.value = [];
      categoryRows.value = [];
      cashMovements.value = [];
      journalRows.value = [];
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const date = selectedDate.value;
      const dayStart = `${date}T00:00:00`;
      const dayEnd = `${date}T23:59:59.999`;

      // 1. Ventes du jour avec items, payments, vendor, client
      const { data: sales, error: salesErr } = await supabase
        .from('sales')
        .select(`
          id,
          ticket_number,
          created_at,
          total,
          discount_amount,
          vendor:vendors(first_name, last_name),
          client:clients(first_name, last_name),
          items:sale_items(
            id,
            product_name,
            quantity,
            subtotal_ttc,
            product_id
          ),
          payments(method, amount)
        `)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .eq('status', 'completed');

      if (salesErr) throw salesErr;

      // 2. Caisse du jour
      const { data: register } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('date', date)
        .maybeSingle();

      fondDeCaisse.value = register?.opening_amount ?? 0;
      caisseTotal.value = register?.closing_amount ?? register?.opening_amount ?? 0;

      let movements: { type: string; amount: number; label: string; created_at: string }[] = [];
      if (register?.id) {
        const { data: movData } = await supabase
          .from('cash_movements')
          .select('type, amount, label, created_at')
          .eq('cash_register_id', register.id)
          .order('created_at', { ascending: true });
        movements = movData || [];
      }

      // 3. Agrégation par mode de paiement
      const byPayment = new Map<string, { ca: number; nb: number }>();
      (sales || []).forEach((s: any) => {
        const payments = s.payments || [];
        payments.forEach((p: { method: PaymentMethod; amount: number }) => {
          const key = p.method;
          const prev = byPayment.get(key) || { ca: 0, nb: 0 };
          prev.ca += p.amount;
          prev.nb += 1;
          byPayment.set(key, prev);
        });
      });

      paymentModeRows.value = Array.from(byPayment.entries()).map(([method, v]) => ({
        method,
        label: paymentLabels[method] || method,
        ca: v.ca,
        nb: v.nb,
      }));

      // 4. Mouvements tiroir (entrée/sortie)
      cashMovements.value = movements.map((m: any) => ({
        type: m.type,
        label: m.label || (m.type === 'in' ? 'Entrée' : 'Sortie'),
        amount: m.amount,
        createdAt: m.created_at,
      }));

      // 5. Agrégation par catégorie (nécessite products pour category)
      const byCategory = new Map<string, { ca: number; nb: number; reduction: number }>();
      const productIds = new Set<string>();
      (sales || []).forEach((s: any) => {
        (s.items || []).forEach((item: any) => {
          if (item.product_id) productIds.add(item.product_id);
        });
      });

      const productIdList = Array.from(productIds);
      let productCategoryMap: Record<string, { name: string; type: string; size?: string | null }> = {};
      if (productIdList.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, type, size, category:categories(name)')
          .in('id', productIdList);
        (products || []).forEach((p: any) => {
          const catName = p.category?.name || (p.type === 'service' ? 'PRESTATION' : 'Produit');
          productCategoryMap[p.id] = { name: catName, type: p.type, size: p.size };
        });
      }

      (sales || []).forEach((s: any) => {
        const saleTotal = s.total ?? 0;
        const saleDiscount = s.discount_amount ?? 0;
        (s.items || []).forEach((item: any) => {
          const itemTtc = item.subtotal_ttc ?? 0;
          const info = productCategoryMap[item.product_id] || { name: 'PRESTATION', type: 'service' };
          const cat = info.name;
          const prev = byCategory.get(cat) || { ca: 0, nb: 0, reduction: 0 };
          prev.ca += itemTtc;
          prev.nb += item.quantity ?? 1;
          prev.reduction += saleTotal > 0 ? (saleDiscount * itemTtc) / saleTotal : 0;
          byCategory.set(cat, prev);
        });
      });

      categoryRows.value = Array.from(byCategory.entries()).map(([cat, v]) => ({
        category: cat,
        ca: v.ca,
        nb: v.nb,
        reduction: v.reduction,
        reductionPct: v.ca > 0 ? (v.reduction / v.ca) * 100 : 0,
      }));

      // 6. Journal des ventes (une ligne par item)
      const journal: JournalRow[] = [];
      (sales || []).forEach((s: any) => {
        const vendorName = s.vendor
          ? `${s.vendor.first_name || ''} ${s.vendor.last_name || ''}`.trim()
          : '—';
        const clientName = s.client
          ? `${s.client.first_name || ''} ${s.client.last_name || ''}`.trim()
          : null;
        const paymentMethod = (s.payments?.[0] as { method: string })?.method
          ? paymentLabels[(s.payments[0] as { method: string }).method] || (s.payments[0] as { method: string }).method
          : '—';

        (s.items || []).forEach((item: any) => {
          const product = productCategoryMap[item.product_id];
          const size = product?.size ?? null;
          journal.push({
            ticketNumber: s.ticket_number || s.id,
            saleTime: new Date(s.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            productName: item.product_name || '—',
            size: size ?? null,
            amount: item.subtotal_ttc ?? 0,
            vendorName,
            paymentMethod,
            clientName,
          });
        });
      });
      journal.sort((a, b) => {
        const ta = a.saleTime;
        const tb = b.saleTime;
        return ta.localeCompare(tb);
      });
      journalRows.value = journal;

    } catch (err: any) {
      console.error('Erreur chargement fin de journée:', err);
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  };

  const totalCA = computed(() =>
    paymentModeRows.value.reduce((sum, r) => sum + r.ca, 0)
  );
  const totalVentes = computed(() =>
    paymentModeRows.value.reduce((sum, r) => sum + r.nb, 0)
  );
  const panierMoyen = computed(() =>
    totalVentes.value > 0 ? totalCA.value / totalVentes.value : 0
  );

  return {
    selectedDate,
    isLoading,
    error,
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
  };
}
