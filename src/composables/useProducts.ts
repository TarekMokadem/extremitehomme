import { ref, computed } from 'vue';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types/database';

// State global
const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Couleurs des catégories par slug
const categoryColors: Record<string, string> = {
  coupes: 'border-blue-500',
  barbe: 'border-amber-500',
  soins: 'border-emerald-500',
  epilation: 'border-rose-500',
  massage: 'border-purple-500',
  produits: 'border-gray-500',
  autres: 'border-gray-400',
};

export function useProducts() {
  // Charger les catégories
  const loadCategories = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (fetchError) throw fetchError;
      categories.value = data || [];
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
      categories.value = [];
    }
  };

  // Charger les produits/services
  const loadProducts = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('is_active', true)
        .order('code');

      if (fetchError) throw fetchError;
      products.value = data || [];
    } catch (err: any) {
      console.error('Erreur chargement produits:', err);
      error.value = err.message;
      products.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  // Rechercher des produits
  const searchProducts = async (query: string): Promise<Product[]> => {
    if (!query || query.length < 2) return [];
    try {
      const { data, error: searchError } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,code.ilike.%${query}%,barcode.ilike.%${query}%`)
        .limit(10);

      if (searchError) throw searchError;
      return data || [];
    } catch (err) {
      console.error('Erreur recherche produits:', err);
      return [];
    }
  };

  // Trouver un produit par code
  const findByCode = async (code: string): Promise<Product | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('code', code)
        .single();

      if (fetchError) return null;
      return data;
    } catch {
      return null;
    }
  };

  // Trouver un produit par code-barres (pour le scan à la caisse)
  const findByBarcode = async (barcode: string): Promise<Product | null> => {
    const trimmed = barcode?.trim();
    if (!trimmed) return null;
    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('barcode', trimmed)
        .eq('is_active', true)
        .single();

      if (fetchError) return null;
      return data;
    } catch {
      return null;
    }
  };

  // Produits filtrés par catégorie
  const getProductsByCategory = (categorySlug: string | null) => {
    if (!categorySlug || categorySlug === 'all') return products.value;
    
    const category = categories.value.find(c => c.slug === categorySlug);
    if (!category) return products.value;
    
    return products.value.filter(p => p.category_id === category.id);
  };

  // Obtenir la couleur de bordure d'une catégorie
  const getCategoryBorderColor = (product: Product): string => {
    const category = categories.value.find(c => c.id === product.category_id);
    if (!category) return 'border-gray-400';
    return categoryColors[category.slug] || 'border-gray-400';
  };

  // Services uniquement
  const services = computed(() => 
    products.value.filter(p => p.type === 'service')
  );

  // Produits physiques uniquement
  const physicalProducts = computed(() => 
    products.value.filter(p => p.type === 'product')
  );

  // Produits en stock bas
  const lowStockProducts = computed(() =>
    products.value.filter(p => 
      p.type === 'product' && 
      p.stock <= p.alert_threshold
    )
  );

  return {
    // State
    products,
    categories,
    isLoading,
    error,
    // Computed
    services,
    physicalProducts,
    lowStockProducts,
    // Methods
    loadCategories,
    loadProducts,
    searchProducts,
    findByCode,
    findByBarcode,
    getProductsByCategory,
    getCategoryBorderColor,
  };
}
