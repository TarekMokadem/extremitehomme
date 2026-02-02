import { ref, computed } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Product, Category, StockMovement, StockMovementType } from '../types/database';

export interface MovementWithDetails extends StockMovement {
  product?: Product;
  vendor?: { first_name: string; last_name: string };
}

const productsWithStock = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const movements = ref<MovementWithDetails[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);

export function useStock() {
  const loadProducts = async () => {
    if (!isSupabaseConfigured()) {
      productsWithStock.value = [];
      return;
    }
    isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(id, name, slug)')
        .eq('type', 'product')
        .order('display_order');

      if (error) throw error;
      productsWithStock.value = data || [];
    } catch (err) {
      console.error('Erreur chargement produits (stock):', err);
      productsWithStock.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const loadMovements = async (productId?: string) => {
    if (!isSupabaseConfigured()) {
      movements.value = [];
      return;
    }
    isLoading.value = true;
    try {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          product:products(id, name, code, stock),
          vendor:vendors(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      movements.value = (data || []) as MovementWithDetails[];
    } catch (err) {
      console.error('Erreur chargement mouvements:', err);
      movements.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Ajoute un mouvement et met à jour le stock du produit.
   * - in: quantity > 0, stock += quantity
   * - out: quantity > 0 (saisi), stock -= quantity (on enregistre -quantity)
   * - adjustment: quantity peut être + ou -, stock += quantity
   */
  const addMovement = async (params: {
    product_id: string;
    type: StockMovementType;
    quantity: number;
    reason: string;
    reference_id?: string | null;
    vendor_id?: string | null;
  }) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');

    const { product_id, type, reason, reference_id = null, vendor_id = null } = params;
    let quantity = params.quantity;

    if (type === 'out' && quantity > 0) {
      quantity = -quantity;
    }
    if (type === 'in' && quantity < 0) {
      quantity = Math.abs(quantity);
    }

    isSaving.value = true;
    try {
      const { error: insertError } = await supabase.from('stock_movements').insert({
        product_id,
        variant_id: null,
        type,
        quantity,
        reason,
        reference_id,
        vendor_id,
      } as Record<string, unknown>);

      if (insertError) throw insertError;

      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', product_id)
        .single();

      const currentStock = (product?.stock as number) ?? 0;
      const newStock = Math.max(0, currentStock + quantity);

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', product_id);

      if (updateError) throw updateError;

      await loadProducts();
      await loadMovements(product_id);
    } finally {
      isSaving.value = false;
    }
  };

  const loadCategories = async () => {
    if (!isSupabaseConfigured()) {
      categories.value = [];
      return;
    }
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      categories.value = data || [];
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
      categories.value = [];
    }
  };

  const createProduct = async (params: {
    name: string;
    code?: string | null;
    category_id?: string | null;
    brand?: string | null;
    model?: string | null;
    price_ht: number;
    tva_rate?: number;
    stock?: number;
    alert_threshold?: number;
  }) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');

    isSaving.value = true;
    try {
      const { error } = await supabase.from('products').insert({
        name: params.name,
        code: params.code || null,
        category_id: params.category_id || null,
        brand: params.brand ?? null,
        model: params.model ?? null,
        type: 'product',
        price_ht: params.price_ht,
        tva_rate: params.tva_rate ?? 0.2,
        stock: params.stock ?? 0,
        alert_threshold: params.alert_threshold ?? 5,
        is_active: true,
        display_order: 999,
      } as Record<string, unknown>);

      if (error) throw error;
      await loadProducts();
    } finally {
      isSaving.value = false;
    }
  };

  const updateAlertThreshold = async (productId: string, alertThreshold: number) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');

    isSaving.value = true;
    try {
      const { error } = await supabase
        .from('products')
        .update({
          alert_threshold: Math.max(0, alertThreshold),
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', productId);

      if (error) throw error;
      await loadProducts();
    } finally {
      isSaving.value = false;
    }
  };

  const productsOnly = computed(() => productsWithStock.value);
  const lowStockList = computed(() =>
    productsWithStock.value.filter((p) => p.stock <= p.alert_threshold)
  );

  return {
    productsWithStock: productsOnly,
    productsOnly,
    lowStockList,
    categories,
    movements,
    loadProducts,
    loadCategories,
    loadMovements,
    addMovement,
    createProduct,
    updateAlertThreshold,
    isLoading,
    isSaving,
  };
}
