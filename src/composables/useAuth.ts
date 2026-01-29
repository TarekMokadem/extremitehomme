import { ref, computed, onMounted } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Vendor, AuthUser } from '../types/database';

// State global
const user = ref<AuthUser | null>(null);
const vendor = ref<Vendor | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

// Vendeurs mockés pour le mode démo
const mockVendors: Vendor[] = [
  { id: '1', auth_user_id: null, email: 'marie@extremites.fr', first_name: 'Marie', last_name: 'Martin', role: 'vendor', color: '#3B82F6', initials: 'MM', is_active: true, created_at: '', updated_at: '' },
  { id: '2', auth_user_id: null, email: 'jean@extremites.fr', first_name: 'Jean', last_name: 'Dupont', role: 'vendor', color: '#10B981', initials: 'JD', is_active: true, created_at: '', updated_at: '' },
  { id: '3', auth_user_id: null, email: 'sophie@extremites.fr', first_name: 'Sophie', last_name: 'Bernard', role: 'vendor', color: '#F59E0B', initials: 'SB', is_active: true, created_at: '', updated_at: '' },
  { id: '4', auth_user_id: null, email: 'lucas@extremites.fr', first_name: 'Lucas', last_name: 'Petit', role: 'vendor', color: '#8B5CF6', initials: 'LP', is_active: true, created_at: '', updated_at: '' },
];

export function useAuth() {
  // Vérifier la session au démarrage
  const checkSession = async () => {
    if (!isSupabaseConfigured()) {
      // Mode démo : utiliser le premier vendeur
      vendor.value = mockVendors[0];
      user.value = {
        id: 'demo',
        email: mockVendors[0].email,
        vendor: mockVendors[0],
      };
      isLoading.value = false;
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        user.value = {
          id: session.user.id,
          email: session.user.email || '',
        };
        
        // Charger les infos du vendeur
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single();
        
        if (vendorData) {
          vendor.value = vendorData;
          user.value.vendor = vendorData;
        }
      }
    } catch (err: any) {
      console.error('Erreur vérification session:', err);
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  };

  // Connexion
  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      // Mode démo : simuler connexion
      const mockVendor = mockVendors.find(v => v.email === email);
      if (mockVendor) {
        vendor.value = mockVendor;
        user.value = { id: 'demo', email, vendor: mockVendor };
        return { success: true };
      }
      return { success: false, error: 'Email non trouvé (mode démo)' };
    }

    try {
      isLoading.value = true;
      error.value = null;

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        user.value = {
          id: data.user.id,
          email: data.user.email || '',
        };

        // Charger les infos du vendeur
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .single();

        if (vendorData) {
          vendor.value = vendorData;
          user.value.vendor = vendorData;
        }

        return { success: true };
      }

      return { success: false, error: 'Connexion échouée' };
    } catch (err: any) {
      error.value = err.message;
      return { success: false, error: err.message };
    } finally {
      isLoading.value = false;
    }
  };

  // Déconnexion
  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      user.value = null;
      vendor.value = null;
      return;
    }

    try {
      await supabase.auth.signOut();
      user.value = null;
      vendor.value = null;
    } catch (err: any) {
      console.error('Erreur déconnexion:', err);
    }
  };

  // Charger tous les vendeurs (pour sélection)
  const loadVendors = async (): Promise<Vendor[]> => {
    if (!isSupabaseConfigured()) {
      return mockVendors;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('vendors')
        .select('*')
        .eq('is_active', true)
        .order('first_name');

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('Erreur chargement vendeurs:', err);
      return mockVendors;
    }
  };

  // Changer de vendeur actif (sans changer d'auth)
  const setActiveVendor = (newVendor: Vendor) => {
    vendor.value = newVendor;
    if (user.value) {
      user.value.vendor = newVendor;
    }
  };

  // Computed
  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => vendor.value?.role === 'admin');
  const isManager = computed(() => 
    vendor.value?.role === 'admin' || vendor.value?.role === 'manager'
  );
  const fullName = computed(() => 
    vendor.value ? `${vendor.value.first_name} ${vendor.value.last_name}` : ''
  );

  // Écouter les changements d'auth
  onMounted(() => {
    if (isSupabaseConfigured()) {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          user.value = {
            id: session.user.id,
            email: session.user.email || '',
          };
        } else if (event === 'SIGNED_OUT') {
          user.value = null;
          vendor.value = null;
        }
      });
    }
  });

  return {
    // State
    user,
    vendor,
    isLoading,
    error,
    // Computed
    isAuthenticated,
    isAdmin,
    isManager,
    fullName,
    // Methods
    checkSession,
    signIn,
    signOut,
    loadVendors,
    setActiveVendor,
  };
}
