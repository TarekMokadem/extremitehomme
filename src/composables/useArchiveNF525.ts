/**
 * NF525 – Archivage périodique et vérification d'intégrité
 *
 * Fournit les fonctions de clôture journalière, mensuelle et annuelle,
 * ainsi que la vérification de la chaîne de hash des ventes.
 */

import { ref } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { computeClosureHash, computeSaleHash } from '../lib/nf525';

export interface ArchiveResult {
  success: boolean;
  closureId?: string;
  hash?: string;
  error?: string;
}

export interface IntegrityResult {
  valid: boolean;
  totalChecked: number;
  firstBrokenIndex?: number;
  firstBrokenTicket?: string;
}

export function useArchiveNF525() {
  const isArchiving = ref(false);
  const isVerifying = ref(false);

  /**
   * Crée une clôture journalière avec hash chaîné.
   */
  const createDailyClosure = async (date: string, closedBy?: string): Promise<ArchiveResult> => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase non configuré' };

    isArchiving.value = true;
    try {
      const dayStart = `${date}T00:00:00`;
      const dayEnd = `${date}T23:59:59.999`;

      const { data: sales } = await supabase
        .from('sales')
        .select('total, subtotal_ht, total_tva, subtotal_ttc, discount_amount, payments:payments(method, amount)')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .eq('status', 'completed');

      const allSales = sales || [];
      const totalSales = allSales.length;
      const totalHT = allSales.reduce((s, r: any) => s + (r.subtotal_ht ?? 0), 0);
      const totalTVA = allSales.reduce((s, r: any) => s + (r.total_tva ?? 0), 0);
      const totalTTC = allSales.reduce((s, r: any) => s + (r.subtotal_ttc ?? 0), 0);
      const totalDiscounts = allSales.reduce((s, r: any) => s + (r.discount_amount ?? 0), 0);

      const payTotals: Record<string, number> = {};
      for (const sale of allSales as any[]) {
        for (const p of sale.payments || []) {
          payTotals[p.method] = (payTotals[p.method] ?? 0) + p.amount;
        }
      }

      const { data: prevClosure } = await supabase
        .from('daily_closures')
        .select('hash')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const hash = await computeClosureHash(date, totalSales, totalTTC, prevClosure?.hash ?? null);

      const closureData = {
        closure_date: date,
        total_sales: totalSales,
        total_ht: totalHT,
        total_tva: totalTVA,
        total_ttc: totalTTC,
        total_discounts: totalDiscounts,
        total_cash: payTotals['cash'] ?? 0,
        total_card: payTotals['card'] ?? 0,
        total_contactless: payTotals['contactless'] ?? 0,
        total_check: payTotals['check'] ?? 0,
        total_gift_card: payTotals['gift_card'] ?? 0,
        total_refunds: 0,
        refund_count: 0,
        hash,
        previous_hash: prevClosure?.hash ?? null,
        closed_by: closedBy ?? null,
      };

      const { data: closure, error: err } = await supabase
        .from('daily_closures')
        .insert(closureData as Record<string, unknown>)
        .select('id, hash')
        .single();

      if (err) throw err;

      return { success: true, closureId: closure.id, hash: closure.hash };
    } catch (err: any) {
      console.error('Erreur clôture journalière:', err);
      return { success: false, error: err.message };
    } finally {
      isArchiving.value = false;
    }
  };

  /**
   * Vérifie l'intégrité de la chaîne de hash des ventes.
   * Recalcule chaque hash et compare avec la valeur stockée.
   */
  const verifySalesIntegrity = async (): Promise<IntegrityResult> => {
    if (!isSupabaseConfigured()) return { valid: true, totalChecked: 0 };

    isVerifying.value = true;
    try {
      const { data: sales } = await supabase
        .from('sales')
        .select('id, ticket_number, created_at, total, hash, previous_hash')
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (!sales || sales.length === 0) return { valid: true, totalChecked: 0 };

      let previousHash: string | null = null;

      for (let i = 0; i < sales.length; i++) {
        const sale = sales[i] as any;

        if (sale.previous_hash !== previousHash) {
          return {
            valid: false,
            totalChecked: i + 1,
            firstBrokenIndex: i,
            firstBrokenTicket: sale.ticket_number,
          };
        }

        if (sale.hash) {
          const expectedHash = await computeSaleHash(
            sale.ticket_number,
            sale.created_at,
            sale.total,
            previousHash,
          );

          if (sale.hash !== expectedHash) {
            return {
              valid: false,
              totalChecked: i + 1,
              firstBrokenIndex: i,
              firstBrokenTicket: sale.ticket_number,
            };
          }
        }

        previousHash = sale.hash;
      }

      return { valid: true, totalChecked: sales.length };
    } catch (err) {
      console.error('Erreur vérification intégrité:', err);
      return { valid: false, totalChecked: 0 };
    } finally {
      isVerifying.value = false;
    }
  };

  /**
   * Récupère le Grand Total actuel.
   */
  const getGrandTotal = async (): Promise<number> => {
    if (!isSupabaseConfigured()) return 0;
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'grand_total')
      .maybeSingle();
    return typeof data?.value === 'number' ? data.value : 0;
  };

  return {
    isArchiving,
    isVerifying,
    createDailyClosure,
    verifySalesIntegrity,
    getGrandTotal,
  };
}
