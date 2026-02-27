import { ref, computed } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { categoryUsesTechnicalStock } from '../lib/stockTechnicalCategories';
import type { Product, Category, StockMovement, StockMovementType, StockCategory } from '../types/database';

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
      productsWithStock.value = (data || []).map(p => ({
        ...p,
        stock_technical: (p as any).stock_technical ?? 0,
      }));
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
        .select('*')
        .order('created_at', { ascending: false })
        .limit(productId ? 100 : 200);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      movements.value = ((data || []) as MovementWithDetails[]).map(m => ({
        ...m,
        stock_type: (m as any).stock_type ?? 'sale',
      }));
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
   * - adjustment: quantity = nouvelle valeur cible du stock (on calcule le delta)
   * 
   * stockType : 'sale' (vente) ou 'technical' (technique)
   */
  const addMovement = async (params: {
    product_id: string;
    type: StockMovementType;
    quantity: number;
    reason: string;
    reference_id?: string | null;
    vendor_id?: string | null;
    stock_type?: StockCategory;
  }) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');

    const { product_id, type, reason, reference_id = null, vendor_id = null, stock_type = 'sale' } = params;
    let quantity = params.quantity;

    const stockColumn = stock_type === 'technical' ? 'stock_technical' : 'stock';

    // Récupérer le stock actuel
    const { data: product } = await supabase
      .from('products')
      .select(`${stockColumn}, stock, stock_technical`)
      .eq('id', product_id)
      .single();

    const currentStock = (product as any)?.[stockColumn] ?? 0;
    let newStock: number;

    if (type === 'adjustment') {
      // Ajustement = fixer le stock à la valeur indiquée
      newStock = Math.max(0, quantity);
      quantity = newStock - currentStock; // delta pour le mouvement
    } else {
      if (type === 'out' && quantity > 0) {
        quantity = -quantity;
      }
      if (type === 'in' && quantity < 0) {
        quantity = Math.abs(quantity);
      }
      newStock = Math.max(0, currentStock + quantity);
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
        stock_type,
      } as Record<string, unknown>);

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('products')
        .update({ [stockColumn]: newStock, updated_at: new Date().toISOString() } as Record<string, unknown>)
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
    barcode?: string | null;
    location?: string | null;
    price_ht: number;
    price_ttc: number;
    tva_rate?: number;
    size?: string | null;
    stock?: number;
    stock_technical?: number;
    alert_threshold?: number;
  }) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');

    const catId = params.category_id && String(params.category_id).trim() ? params.category_id : null;
    const barcodeVal = params.barcode?.trim() || null;
    const cat = categories.value.find((c) => c.id === catId);
    const usesTechnicalStock = categoryUsesTechnicalStock(cat?.slug);

    isSaving.value = true;
    try {
      const payload: Record<string, unknown> = {
        name: params.name.trim(),
        code: params.code?.trim() || null,
        description: null,
        category_id: catId,
        brand: params.brand?.trim() || null,
        model: params.model?.trim() || null,
        barcode: barcodeVal,
        location: params.location?.trim() || null,
        type: 'product',
        price_ht: Number(params.price_ht) || 0,
        price_ttc: Number(params.price_ttc) || 0,
        tva_rate: params.tva_rate ?? 0.2,
        size: params.size?.trim() || null,
        duration: null,
        stock: Math.max(0, Number(params.stock) || 0),
        alert_threshold: Math.max(0, Number(params.alert_threshold) || 5),
        is_active: true,
        display_order: 999,
      };
      if (usesTechnicalStock) {
        payload.stock_technical = Math.max(0, Number(params.stock_technical) || 0);
      }

      const { error } = await supabase.from('products').insert(payload);

      if (error) {
        const msg = error.message || JSON.stringify(error);
        throw new Error(`Erreur création produit: ${msg}`);
      }
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

  const updateBarcode = async (productId: string, barcode: string | null) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');

    isSaving.value = true;
    try {
      const value = barcode?.trim() || null;
      const { error } = await supabase
        .from('products')
        .update({
          barcode: value,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', productId);

      if (error) throw error;
      await loadProducts();
    } finally {
      isSaving.value = false;
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');

    isSaving.value = true;
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);

      if (error) {
        const msg = error.message || JSON.stringify(error);
        throw new Error(`Erreur suppression: ${msg}`);
      }
      await loadProducts();
    } finally {
      isSaving.value = false;
    }
  };

  const updateProduct = async (
    productId: string,
    params: {
      name?: string;
      code?: string | null;
      barcode?: string | null;
      category_id?: string | null;
      brand?: string | null;
      model?: string | null;
      location?: string | null;
      price_ht?: number;
      price_ttc?: number;
      tva_rate?: number;
      size?: string | null;
      stock?: number;
      stock_technical?: number;
      alert_threshold?: number;
    }
  ) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');

    const cat = params.category_id
      ? categories.value.find((c) => c.id === params.category_id)
      : productsWithStock.value.find((p) => p.id === productId)?.category;
    const usesTechnicalStock = categoryUsesTechnicalStock(cat?.slug);

    const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (params.name !== undefined) clean.name = params.name.trim();
    if (params.code !== undefined) clean.code = params.code?.trim() || null;
    if (params.barcode !== undefined) clean.barcode = params.barcode?.trim() || null;
    if (params.category_id !== undefined) clean.category_id = params.category_id?.trim() ? params.category_id : null;
    if (params.brand !== undefined) clean.brand = params.brand?.trim() || null;
    if (params.model !== undefined) clean.model = params.model?.trim() || null;
    if (params.location !== undefined) clean.location = params.location?.trim() || null;
    if (params.price_ht !== undefined) clean.price_ht = Number(params.price_ht) || 0;
    if (params.price_ttc !== undefined) clean.price_ttc = Number(params.price_ttc) || 0;
    if (params.tva_rate !== undefined) clean.tva_rate = params.tva_rate;
    if (params.size !== undefined) clean.size = params.size?.trim() || null;
    if (params.stock !== undefined) clean.stock = Math.max(0, Number(params.stock) || 0);
    if (usesTechnicalStock && params.stock_technical !== undefined) {
      clean.stock_technical = Math.max(0, Number(params.stock_technical) || 0);
    }
    if (params.alert_threshold !== undefined) clean.alert_threshold = Math.max(0, Number(params.alert_threshold) || 5);

    isSaving.value = true;
    try {
      const { error } = await supabase.from('products').update(clean).eq('id', productId);

      if (error) {
        const msg = error.message || JSON.stringify(error);
        throw new Error(`Erreur mise à jour: ${msg}`);
      }
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
    deleteProduct,
    updateAlertThreshold,
    updateBarcode,
    updateProduct,
    isLoading,
    isSaving,
  };
}
