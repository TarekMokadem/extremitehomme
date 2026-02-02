import { ref, computed } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Json } from '../types/database';

// Types pour les paramètres (alignés sur le schéma Supabase)
export interface SalonInfo {
  name: string;
  address: string;
  phone: string;
  siret: string;
}

export interface TvaRates {
  normal: number;
  reduced: number;
  super_reduced: number;
}

export interface TicketLines {
  line1: string;
  line2: string;
  line3?: string;
}

export interface LoyaltyConfig {
  points_per_euro: number;
  euros_per_point: number;
  enabled: boolean;
}

const defaults = {
  salon_info: {
    name: 'Extrémités Homme',
    address: '',
    phone: '',
    siret: '',
  } as SalonInfo,
  tva_rates: {
    normal: 0.2,
    reduced: 0.1,
    super_reduced: 0.055,
  } as TvaRates,
  ticket_header: {
    line1: 'Extrémités Homme',
    line2: '',
    line3: '',
  } as TicketLines,
  ticket_footer: {
    line1: 'Merci de votre visite !',
    line2: '',
  } as TicketLines,
  loyalty: {
    points_per_euro: 1,
    euros_per_point: 0.01,
    enabled: false,
  } as LoyaltyConfig,
};

const settingsMap = ref<Record<string, Json>>({});
const isLoading = ref(false);
const isSaving = ref(false);

export function useSettings() {
  const loadSettings = async () => {
    if (!isSupabaseConfigured()) {
      Object.keys(defaults).forEach((key) => {
        settingsMap.value[key] = defaults[key as keyof typeof defaults] as Json;
      });
      return;
    }

    isLoading.value = true;
    try {
      const { data, error } = await supabase.from('settings').select('key, value');
      if (error) throw error;

      const map: Record<string, Json> = {};
      (data || []).forEach((row: { key: string; value: Json }) => {
        map[row.key] = row.value;
      });

      // Remplir avec les défauts si une clé manque
      (Object.keys(defaults) as (keyof typeof defaults)[]).forEach((key) => {
        if (map[key] == null) {
          map[key] = defaults[key] as Json;
        }
      });

      settingsMap.value = map;
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
      Object.keys(defaults).forEach((key) => {
        settingsMap.value[key] = defaults[key as keyof typeof defaults] as Json;
      });
    } finally {
      isLoading.value = false;
    }
  };

  const saveSetting = async (key: string, value: Json) => {
    if (!isSupabaseConfigured()) {
      settingsMap.value[key] = value;
      return;
    }

    isSaving.value = true;
    try {
      const { error } = await supabase
        .from('settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() } as Record<string, unknown>,
          { onConflict: 'key' }
        );
      if (error) throw error;
      settingsMap.value[key] = value;
    } catch (err) {
      console.error('Erreur sauvegarde paramètre:', err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  };

  const get = <T>(key: string): T => {
    const raw = settingsMap.value[key];
    if (raw == null) {
      const def = (defaults as Record<string, T>)[key];
      return def ?? ({} as T);
    }
    return raw as T;
  };

  const salonInfo = computed<SalonInfo>(() => get<SalonInfo>('salon_info'));
  const tvaRates = computed<TvaRates>(() => get<TvaRates>('tva_rates'));
  const ticketHeader = computed<TicketLines>(() => get<TicketLines>('ticket_header'));
  const ticketFooter = computed<TicketLines>(() => get<TicketLines>('ticket_footer'));
  const loyaltyConfig = computed<LoyaltyConfig>(() => get<LoyaltyConfig>('loyalty'));

  return {
    loadSettings,
    saveSetting,
    get,
    salonInfo,
    tvaRates,
    ticketHeader,
    ticketFooter,
    loyaltyConfig,
    isLoading,
    isSaving,
  };
}
