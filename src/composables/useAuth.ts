import { ref, computed, onMounted } from 'vue';
import { supabase } from '../lib/supabase';
import {
  SESSION_TIMEOUT_MINUTES,
  LAST_ACTIVITY_KEY,
} from '../lib/sessionConfig';
import type { Vendor, AuthUser } from '../types/database';

// State global
const user = ref<AuthUser | null>(null);
const vendor = ref<Vendor | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

// Session : timeout d'inactivité
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;
let activityThrottle: ReturnType<typeof setTimeout> | null = null;
let expiryCheckInterval: ReturnType<typeof setInterval> | null = null;

function updateLastActivity(): void {
  try {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {
    // sessionStorage indisponible
  }
}

function getLastActivity(): number {
  try {
    const v = sessionStorage.getItem(LAST_ACTIVITY_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

function isSessionExpired(): boolean {
  const last = getLastActivity();
  if (last === 0) return false;
  return Date.now() - last > SESSION_TIMEOUT_MS;
}

function clearSessionStorage(): void {
  try {
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // ignore
  }
}

export function useAuth() {
  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        user.value = {
          id: session.user.id,
          email: session.user.email || '',
        };
        
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single();
        
        if (vendorData) {
          vendor.value = vendorData;
          user.value.vendor = vendorData;
        } else {
          const { data: defaultVendor } = await supabase
            .from('vendors')
            .select('*')
            .eq('is_active', true)
            .order('created_at')
            .limit(1)
            .single();
          if (defaultVendor) {
            vendor.value = defaultVendor;
            user.value.vendor = defaultVendor;
          }
        }
        startSessionWatch();
      }
    } catch (err: any) {
      console.error('Erreur vérification session:', err);
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  };

  const signIn = async (email: string, password: string) => {
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

        startSessionWatch();
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

  const signOut = async () => {
    stopSessionWatch();
    clearSessionStorage();
    try {
      await supabase.auth.signOut();
    } catch (err: any) {
      console.error('Erreur déconnexion:', err);
    }
    user.value = null;
    vendor.value = null;
  };

  const forceSessionExpiry = () => {
    stopSessionWatch();
    clearSessionStorage();
    supabase.auth.signOut().catch(() => {});
    user.value = null;
    vendor.value = null;
  };

  // Suivi d'activité (throttlé) pour le timeout
  const onActivity = () => {
    if (activityThrottle) return;
    activityThrottle = setTimeout(() => {
      updateLastActivity();
      activityThrottle = null;
    }, 60000); // throttle 1 min
  };

  const startSessionWatch = () => {
    updateLastActivity();
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, onActivity));
    expiryCheckInterval = setInterval(() => {
      if (isSessionExpired()) {
        forceSessionExpiry();
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
    }, 60000); // vérifier toutes les minutes
  };

  const stopSessionWatch = () => {
    if (expiryCheckInterval) {
      clearInterval(expiryCheckInterval);
      expiryCheckInterval = null;
    }
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.removeEventListener(e, onActivity));
    if (activityThrottle) {
      clearTimeout(activityThrottle);
      activityThrottle = null;
    }
  };

  const loadVendors = async (): Promise<Vendor[]> => {
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
      return [];
    }
  };

  // Gardé pour compatibilité (TicketPanel, etc.) - un seul compte, pas de changement
  const setActiveVendor = (_newVendor: Vendor) => {
    // Compte unique : pas de changement de vendeur
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

  onMounted(() => {
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
