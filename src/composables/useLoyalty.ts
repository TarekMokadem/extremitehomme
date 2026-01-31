import { ref, computed } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Types
export interface LoyaltyStamp {
  position: number; // 1-10
  isStamped: boolean;
  date: string | null;
}

// State
const selectedClientId = ref<string | null>(null);
const stamps = ref<LoyaltyStamp[]>([]);
const isLoading = ref(false);

// Initialiser une nouvelle carte de fidélité (10 cases vides)
const initializeCard = () => {
  stamps.value = Array.from({ length: 10 }, (_, i) => ({
    position: i + 1,
    isStamped: false,
    date: null,
  }));
};

// Charger les points d'un client
const loadClientStamps = async (clientId: string) => {
  selectedClientId.value = clientId;
  isLoading.value = true;

  if (!isSupabaseConfigured()) {
    initializeCard();
    isLoading.value = false;
    return;
  }

  try {
    // Charger les 10 dernières transactions de points
    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('client_id', clientId)
      .eq('type', 'earned')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Créer la carte avec les 10 derniers points
    const transactions = data || [];
    stamps.value = Array.from({ length: 10 }, (_, i) => {
      const transaction = transactions[i];
      return {
        position: i + 1,
        isStamped: !!transaction,
        date: transaction?.created_at || null,
      };
    });
  } catch (err) {
    console.error('Erreur chargement points:', err);
    initializeCard();
  } finally {
    isLoading.value = false;
  }
};

// Toggle une case (cocher/décocher)
const toggleStamp = (position: number) => {
  const stamp = stamps.value.find(s => s.position === position);
  if (stamp) {
    stamp.isStamped = !stamp.isStamped;
    // Si on coche, on met la date actuelle (temporaire jusqu'à validation)
    stamp.date = stamp.isStamped ? new Date().toISOString() : null;
  }
};

// Compter les cases cochées
const checkedCount = computed(() => 
  stamps.value.filter(s => s.isStamped).length
);

// Vérifier si la carte est complète
const isCardComplete = computed(() => checkedCount.value === 10);

// Sauvegarder les points lors de la validation de vente
const saveStamps = async (clientId: string, vendorId: string, saleId: string) => {
  if (!isSupabaseConfigured()) return;

  const newStamps = stamps.value.filter(s => s.isStamped);
  if (newStamps.length === 0) return;

  try {
    // Créer une transaction pour chaque nouveau tampon
    const transactions = newStamps.map(stamp => ({
      client_id: clientId,
      vendor_id: vendorId,
      sale_id: saleId,
      points: 1,
      type: 'earned' as const,
      notes: `Point ${stamp.position}/10`,
    }));

    const { error } = await supabase
      .from('loyalty_transactions')
      .insert(transactions as any);

    if (error) throw error;

    // Mettre à jour le total de points du client
    const { data: currentClient } = await supabase
      .from('clients')
      .select('loyalty_points')
      .eq('id', clientId)
      .single();

    if (currentClient) {
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          loyalty_points: currentClient.loyalty_points + newStamps.length
        })
        .eq('id', clientId);

      if (updateError) {
        console.warn('Erreur mise à jour points client:', updateError);
      }
    }

    console.log(`✅ ${newStamps.length} point(s) de fidélité attribué(s)`);
  } catch (err) {
    console.error('Erreur sauvegarde points:', err);
  }
};

// Réinitialiser
const clearStamps = () => {
  selectedClientId.value = null;
  initializeCard();
};

export function useLoyalty() {
  return {
    // State
    stamps,
    selectedClientId,
    isLoading,
    // Computed
    checkedCount,
    isCardComplete,
    // Methods
    initializeCard,
    loadClientStamps,
    toggleStamp,
    saveStamps,
    clearStamps,
  };
}
