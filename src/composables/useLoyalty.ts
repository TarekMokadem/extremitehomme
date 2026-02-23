import { ref, computed } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Types
export interface LoyaltyStamp {
  position: number; // 1-12
  isStamped: boolean;
  date: string | null;
  transactionId?: string | null; // ID de la transaction en BDD (pour suppression)
  markedForRemoval?: boolean; // Marqué pour retrait manuel
}

const STAMPS_COUNT = 12;

// State
const selectedClientId = ref<string | null>(null);
const stamps = ref<LoyaltyStamp[]>([]);
const isLoading = ref(false);

// Initialiser une nouvelle carte de fidélité (12 cases vides)
const initializeCard = () => {
  stamps.value = Array.from({ length: STAMPS_COUNT }, (_, i) => ({
    position: i + 1,
    isStamped: false,
    date: null,
    transactionId: null,
    markedForRemoval: false,
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
    // Charger les 12 dernières transactions de points
    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('client_id', clientId)
      .eq('type', 'earned')
      .order('created_at', { ascending: false })
      .limit(STAMPS_COUNT);

    if (error) throw error;

    // Créer la carte avec les 12 derniers points
    const transactions = data || [];
    stamps.value = Array.from({ length: STAMPS_COUNT }, (_, i) => {
      const transaction = transactions[i];
      return {
        position: i + 1,
        isStamped: !!transaction,
        date: transaction?.created_at || null,
        transactionId: transaction?.id || null,
        markedForRemoval: false,
      };
    });
  } catch (err) {
    console.error('Erreur chargement points:', err);
    if (stamps.value.length === 0) {
      initializeCard();
    }
  } finally {
    isLoading.value = false;
  }
};

// Toggle une case (cocher/décocher) ou marquer pour retrait
const toggleStamp = (position: number) => {
  const stamp = stamps.value.find(s => s.position === position);
  if (!stamp) return;
  if (stamp.date) {
    // Point déjà enregistré : toggle marqué pour retrait
    stamp.markedForRemoval = !stamp.markedForRemoval;
  } else {
    // Point non enregistré : toggle cocher/décocher
    stamp.isStamped = !stamp.isStamped;
    if (!stamp.isStamped) stamp.date = null;
  }
};

// Compter les cases cochées
const checkedCount = computed(() => 
  stamps.value.filter(s => s.isStamped).length
);

// Vérifier si la carte est complète
const isCardComplete = computed(() => checkedCount.value === STAMPS_COUNT);

// Ajouter des points manuellement (sans vente)
const addPointsManually = async (clientId: string, vendorId: string) => {
  const newStamps = stamps.value.filter(s => s.isStamped && !s.date);
  if (newStamps.length === 0) return { success: false, count: 0 };

  if (!isSupabaseConfigured()) {
    // Mode démo : mettre à jour les dates localement
    const now = new Date().toISOString();
    stamps.value = stamps.value.map(stamp => {
      if (stamp.isStamped && !stamp.date) return { ...stamp, date: now };
      return stamp;
    });
    return { success: true, count: newStamps.length };
  }

  try {
    const transactions = newStamps.map(stamp => ({
      client_id: clientId,
      vendor_id: vendorId,
      sale_id: null,
      points: 1,
      type: 'earned' as const,
      notes: `Point ${stamp.position}/${STAMPS_COUNT} (manuel)`,
    }));

    const { data, error } = await supabase
      .from('loyalty_transactions')
      .insert(transactions as any)
      .select('id, created_at');

    if (error) throw error;

    if (data && data.length > 0) {
      let idx = 0;
      stamps.value = stamps.value.map(stamp => {
        if (stamp.isStamped && !stamp.date && data[idx]) {
          const row = data[idx] as { id: string; created_at: string };
          idx += 1;
          return { ...stamp, date: row.created_at, transactionId: row.id, markedForRemoval: false };
        }
        return stamp;
      });
    }

    const { data: currentClient } = await supabase
      .from('clients')
      .select('loyalty_points')
      .eq('id', clientId)
      .single();

    if (currentClient) {
      await supabase
        .from('clients')
        .update({ loyalty_points: currentClient.loyalty_points + newStamps.length })
        .eq('id', clientId);
    }

    console.log(`✅ ${newStamps.length} point(s) fidélité ajouté(s) manuellement`);
    return { success: true, count: newStamps.length };
  } catch (err) {
    console.error('Erreur ajout manuel points:', err);
    return { success: false, count: 0 };
  }
};

// Retirer des points manuellement
const removePointsManually = async (clientId: string) => {
  const toRemove = stamps.value.filter(s => s.markedForRemoval && s.transactionId);
  if (toRemove.length === 0) return { success: false, count: 0 };

  if (!isSupabaseConfigured()) {
    stamps.value = stamps.value.map(stamp => {
      if (stamp.markedForRemoval) {
        return { position: stamp.position, isStamped: false, date: null, transactionId: null, markedForRemoval: false };
      }
      return stamp;
    });
    return { success: true, count: toRemove.length };
  }

  try {
    for (const stamp of toRemove) {
      if (stamp.transactionId) {
        await supabase.from('loyalty_transactions').delete().eq('id', stamp.transactionId);
      }
    }

    const { data: currentClient } = await supabase
      .from('clients')
      .select('loyalty_points')
      .eq('id', clientId)
      .single();

    if (currentClient) {
      const newTotal = Math.max(0, (currentClient as { loyalty_points: number }).loyalty_points - toRemove.length);
      await supabase.from('clients').update({ loyalty_points: newTotal } as any).eq('id', clientId);
    }

    stamps.value = stamps.value.map(stamp => {
      if (stamp.markedForRemoval) {
        return { position: stamp.position, isStamped: false, date: null, transactionId: null, markedForRemoval: false };
      }
      return stamp;
    });

    console.log(`✅ ${toRemove.length} point(s) fidélité retiré(s)`);
    return { success: true, count: toRemove.length };
  } catch (err) {
    console.error('Erreur retrait manuel points:', err);
    return { success: false, count: 0 };
  }
};

// Sauvegarder les points lors de la validation de vente
const saveStamps = async (clientId: string, vendorId: string, saleId: string) => {
  if (!isSupabaseConfigured()) return;

  const newStamps = stamps.value.filter(s => s.isStamped && !s.date);
  if (newStamps.length === 0) return;

  try {
    // Créer une transaction pour chaque nouveau tampon
    const transactions = newStamps.map((stamp: LoyaltyStamp) => ({
      client_id: clientId,
      vendor_id: vendorId,
      sale_id: saleId,
      points: 1,
      type: 'earned' as const,
      notes: `Point ${stamp.position}/${STAMPS_COUNT}`,
    }));

    const { data, error } = await supabase
      .from('loyalty_transactions')
      .insert(transactions as any)
      .select('created_at');

    if (error) throw error;

    // Mettre à jour les dates localement (retour Supabase dans le même ordre)
    if (data && data.length > 0) {
      let idx = 0;
      stamps.value = stamps.value.map(stamp => {
        if (stamp.isStamped && !stamp.date && data[idx]) {
          const createdAt = data[idx].created_at;
          idx += 1;
          return { ...stamp, date: createdAt };
        }
        return stamp;
      });
    }

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

// Réinitialiser l'affichage local
const clearStamps = () => {
  selectedClientId.value = null;
  initializeCard();
};

// Réinitialiser les points du client à 0 en BDD (et rafraîchir l'affichage)
const resetPointsToZero = async (clientId: string) => {
  if (!isSupabaseConfigured()) {
    initializeCard();
    return;
  }
  try {
    const { error } = await supabase
      .from('clients')
      .update({ loyalty_points: 0 })
      .eq('id', clientId);
    if (error) throw error;
    await loadClientStamps(clientId);
  } catch (err) {
    console.error('Erreur réinitialisation points:', err);
    throw err;
  }
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
    stampsCount: STAMPS_COUNT,
    // Methods
    initializeCard,
    loadClientStamps,
    toggleStamp,
    addPointsManually,
    removePointsManually,
    saveStamps,
    clearStamps,
    resetPointsToZero,
  };
}
