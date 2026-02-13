import { ref, computed } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Product, Category } from '../types/database';

// Données mockées pour le mode démo (si Supabase non configuré)
const mockCategories: Category[] = [
  { id: '1', name: 'Coupes', slug: 'coupes', color: '#3B82F6', display_order: 1, is_active: true, created_at: '' },
  { id: '2', name: 'Barbe', slug: 'barbe', color: '#F59E0B', display_order: 2, is_active: true, created_at: '' },
  { id: '3', name: 'Soins', slug: 'soins', color: '#10B981', display_order: 3, is_active: true, created_at: '' },
  { id: '4', name: 'Épilation', slug: 'epilation', color: '#EC4899', display_order: 4, is_active: true, created_at: '' },
  { id: '5', name: 'Massage', slug: 'massage', color: '#8B5CF6', display_order: 5, is_active: true, created_at: '' },
  { id: '6', name: 'Autres', slug: 'autres', color: '#9CA3AF', display_order: 99, is_active: true, created_at: '' },
];

const mockProducts: Product[] = [
  { id: '1', code: 'C01', name: 'Coupe Homme', type: 'service', category_id: '1', price_ht: 16.67, tva_rate: 0.20, price_ttc: 20, duration: 30, stock: 0, alert_threshold: 0, is_active: true, display_order: 1, description: null, created_at: '', updated_at: '' },
  { id: '2', code: 'C02', name: 'Coupe Enfant', type: 'service', category_id: '1', price_ht: 12.50, tva_rate: 0.20, price_ttc: 15, duration: 20, stock: 0, alert_threshold: 0, is_active: true, display_order: 2, description: null, created_at: '', updated_at: '' },
  { id: '3', code: 'C03', name: 'Coupe + Barbe', type: 'service', category_id: '1', price_ht: 25.00, tva_rate: 0.20, price_ttc: 30, duration: 45, stock: 0, alert_threshold: 0, is_active: true, display_order: 3, description: null, created_at: '', updated_at: '' },
  { id: '4', code: 'B01', name: 'Taille Barbe', type: 'service', category_id: '2', price_ht: 10.00, tva_rate: 0.20, price_ttc: 12, duration: 15, stock: 0, alert_threshold: 0, is_active: true, display_order: 1, description: null, created_at: '', updated_at: '' },
  { id: '5', code: 'B02', name: 'Rasage Traditionnel', type: 'service', category_id: '2', price_ht: 16.67, tva_rate: 0.20, price_ttc: 20, duration: 25, stock: 0, alert_threshold: 0, is_active: true, display_order: 2, description: null, created_at: '', updated_at: '' },
  { id: '6', code: 'S01', name: 'Soin Visage', type: 'service', category_id: '3', price_ht: 25.00, tva_rate: 0.20, price_ttc: 30, duration: 30, stock: 0, alert_threshold: 0, is_active: true, display_order: 1, description: null, created_at: '', updated_at: '' },
  { id: '7', code: 'E01', name: 'Sourcils', type: 'service', category_id: '4', price_ht: 5.00, tva_rate: 0.20, price_ttc: 6, duration: 10, stock: 0, alert_threshold: 0, is_active: true, display_order: 1, description: null, created_at: '', updated_at: '' },
  { id: '8', code: 'M01', name: 'Massage Crânien', type: 'service', category_id: '5', price_ht: 12.50, tva_rate: 0.20, price_ttc: 15, duration: 15, stock: 0, alert_threshold: 0, is_active: true, display_order: 1, description: null, created_at: '', updated_at: '' },
];

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
    if (!isSupabaseConfigured()) {
      categories.value = mockCategories;
      return;
    }

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
      categories.value = mockCategories;
    }
  };

  // Charger les produits/services
  const loadProducts = async () => {
    isLoading.value = true;
    error.value = null;

    if (!isSupabaseConfigured()) {
      products.value = mockProducts;
      isLoading.value = false;
      return;
    }

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
      products.value = mockProducts;
    } finally {
      isLoading.value = false;
    }
  };

  // Rechercher des produits
  const searchProducts = async (query: string): Promise<Product[]> => {
    if (!query || query.length < 2) return [];

    if (!isSupabaseConfigured()) {
      const q = query.toLowerCase();
      return mockProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        (p as Product).barcode?.toLowerCase().includes(q)
      );
    }

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
    if (!isSupabaseConfigured()) {
      return mockProducts.find(p => p.code === code) || null;
    }

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

    if (!isSupabaseConfigured()) {
      return (mockProducts as Product[]).find(p => p.barcode === trimmed) || null;
    }

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
