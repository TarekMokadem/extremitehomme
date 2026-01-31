import { ref, computed } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { CashRegister, CashMovement } from '../types/database';

// State
const currentRegister = ref<CashRegister | null>(null);
const movements = ref<CashMovement[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

export function useCashRegister() {
  // =====================================================
  // CHARGEMENT
  // =====================================================

  // Charger la caisse du jour (ou d'une date spécifique)
  const loadRegister = async (date: string) => {
    if (!isSupabaseConfigured()) {
      currentRegister.value = null;
      movements.value = [];
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from('cash_registers')
        .select('*, vendor:vendors(first_name, last_name, initials)')
        .eq('date', date)
        .maybeSingle();

      if (fetchError) throw fetchError;

      currentRegister.value = data as CashRegister | null;

      if (data) {
        await loadMovements(data.id);
      } else {
        movements.value = [];
      }
    } catch (err: any) {
      console.error('Erreur chargement caisse:', err);
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  };

  // Charger les mouvements d'une caisse
  const loadMovements = async (registerId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('cash_movements')
        .select('*, vendor:vendors(first_name, last_name, initials)')
        .eq('cash_register_id', registerId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      movements.value = (data || []) as CashMovement[];
    } catch (err) {
      console.error('Erreur chargement mouvements:', err);
      movements.value = [];
    }
  };

  // =====================================================
  // OUVERTURE DE CAISSE
  // =====================================================

  const openRegister = async (date: string, openingAmount: number, vendorId?: string) => {
    if (!isSupabaseConfigured()) return null;

    isLoading.value = true;
    error.value = null;

    try {
      const { data, error: insertError } = await supabase
        .from('cash_registers')
        .insert({
          date,
          opening_amount: openingAmount,
          vendor_id: vendorId || null,
          status: 'open',
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      currentRegister.value = data as CashRegister;
      movements.value = [];
      return data;
    } catch (err: any) {
      console.error('Erreur ouverture caisse:', err);
      error.value = err.message;
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  // =====================================================
  // MOUVEMENTS
  // =====================================================

  const addMovement = async (
    type: 'in' | 'out',
    amount: number,
    label: string,
    vendorId?: string
  ) => {
    if (!currentRegister.value || !isSupabaseConfigured()) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('cash_movements')
        .insert({
          cash_register_id: currentRegister.value.id,
          type,
          amount,
          label,
          vendor_id: vendorId || null,
        } as any)
        .select('*, vendor:vendors(first_name, last_name, initials)')
        .single();

      if (insertError) throw insertError;

      movements.value.push(data as CashMovement);
      return data;
    } catch (err: any) {
      console.error('Erreur ajout mouvement:', err);
      error.value = err.message;
      return null;
    }
  };

  const deleteMovement = async (movementId: string) => {
    if (!isSupabaseConfigured()) return false;

    try {
      const { error: deleteError } = await supabase
        .from('cash_movements')
        .delete()
        .eq('id', movementId);

      if (deleteError) throw deleteError;

      movements.value = movements.value.filter(m => m.id !== movementId);
      return true;
    } catch (err: any) {
      console.error('Erreur suppression mouvement:', err);
      error.value = err.message;
      return false;
    }
  };

  // =====================================================
  // CALCULS
  // =====================================================

  // Total des entrées manuelles
  const totalIn = computed(() => 
    movements.value.filter(m => m.type === 'in').reduce((sum, m) => sum + m.amount, 0)
  );

  // Total des sorties/dépenses
  const totalOut = computed(() => 
    movements.value.filter(m => m.type === 'out').reduce((sum, m) => sum + m.amount, 0)
  );

  // Solde des mouvements manuels
  const movementsBalance = computed(() => totalIn.value - totalOut.value);

  // =====================================================
  // FERMETURE DE CAISSE
  // =====================================================

  const closeRegister = async (closingAmount: number, cashSalesTotal: number, notes?: string) => {
    if (!currentRegister.value || !isSupabaseConfigured()) return null;

    try {
      // Montant théorique = fond + ventes espèces + entrées - sorties
      const expectedAmount = 
        currentRegister.value.opening_amount + 
        cashSalesTotal + 
        totalIn.value - 
        totalOut.value;

      const difference = closingAmount - expectedAmount;

      const { data, error: updateError } = await supabase
        .from('cash_registers')
        .update({
          closing_amount: closingAmount,
          expected_amount: expectedAmount,
          difference,
          status: 'closed',
          closed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', currentRegister.value.id)
        .select()
        .single();

      if (updateError) throw updateError;

      currentRegister.value = data as CashRegister;
      return data;
    } catch (err: any) {
      console.error('Erreur fermeture caisse:', err);
      error.value = err.message;
      return null;
    }
  };

  // =====================================================
  // HISTORIQUE DES CAISSES
  // =====================================================

  const loadRegisterHistory = async (limit: number = 30) => {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('cash_registers')
        .select('*, vendor:vendors(first_name, last_name, initials)')
        .order('date', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      return (data || []) as CashRegister[];
    } catch (err) {
      console.error('Erreur chargement historique:', err);
      return [];
    }
  };

  return {
    // State
    currentRegister,
    movements,
    isLoading,
    error,
    // Computed
    totalIn,
    totalOut,
    movementsBalance,
    // Methods
    loadRegister,
    openRegister,
    addMovement,
    deleteMovement,
    closeRegister,
    loadRegisterHistory,
  };
}
