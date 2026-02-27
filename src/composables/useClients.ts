import { ref } from 'vue';
import { supabase } from '../lib/supabase';
import type { Client } from '../types/database';

type ClientInsert = {
  first_name: string;
  last_name: string;
  phone: string;
  phone2?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  birth_date?: string | null;
  notes?: string | null;
  company?: string | null;
};

// State global
const clients = ref<Client[]>([]);
const selectedClient = ref<Client | null>(null);
/** Si true, la facture sera au nom de l'entreprise du client (sinon au nom du client) */
const invoiceInCompanyName = ref(false);
const isLoading = ref(false);
const error = ref<string | null>(null);

export function useClients() {
  // Charger tous les clients
  const loadClients = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .order('last_name');

      if (fetchError) throw fetchError;
      clients.value = data || [];
    } catch (err: any) {
      console.error('Erreur chargement clients:', err);
      error.value = err.message;
      clients.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  // Rechercher des clients
  const searchClients = async (query: string): Promise<Client[]> => {
    if (!query || query.length < 2) return [];
    try {
      const { data, error: searchError } = await supabase
        .from('clients')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      if (searchError) throw searchError;
      return data || [];
    } catch (err) {
      console.error('Erreur recherche clients:', err);
      return [];
    }
  };

  // Obtenir un client par ID
  const getClientById = async (id: string): Promise<Client | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) return null;
      return data;
    } catch {
      return null;
    }
  };

  // Créer un nouveau client
  const createClient = async (clientData: ClientInsert): Promise<Client | null> => {
    try {
      console.log('Insertion dans Supabase...');
      const { data, error: insertError } = await supabase
        .from('clients')
        .insert({
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          phone: clientData.phone,
          phone2: clientData.phone2 || null,
          email: clientData.email || null,
          address: clientData.address || null,
          city: clientData.city || null,
          postal_code: clientData.postal_code || null,
          birth_date: clientData.birth_date || null,
          notes: clientData.notes || null,
          company: clientData.company ?? null,
        } as any)
        .select()
        .single();

      if (insertError) {
        console.error('Erreur Supabase:', insertError);
        throw insertError;
      }
      
      console.log('Client créé avec succès:', data);
      return data as Client;
    } catch (err: any) {
      console.error('Erreur création client:', err);
      error.value = err.message;
      return null;
    }
  };

  // Mettre à jour un client
  const updateClient = async (id: string, updates: Partial<ClientInsert>): Promise<Client | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('clients')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      console.log('Client mis à jour:', data);
      return data as Client;
    } catch (err: any) {
      console.error('Erreur mise à jour client:', err);
      error.value = err.message;
      return null;
    }
  };

  // Sélectionner un client
  const selectClient = (client: Client | null) => {
    selectedClient.value = client;
  };

  const setInvoiceInCompanyName = (value: boolean) => {
    invoiceInCompanyName.value = value;
  };

  // Effacer la sélection
  const clearSelection = () => {
    selectedClient.value = null;
    invoiceInCompanyName.value = false;
  };

  // Mettre à jour les stats après une vente
  const updateClientAfterSale = async (clientId: string, saleTotal: number) => {
    try {
      // Récupérer le client actuel
      const { data: currentClient } = await supabase
        .from('clients')
        .select('visit_count, total_spent')
        .eq('id', clientId)
        .single();

      if (currentClient) {
        await supabase
          .from('clients')
          .update({
            visit_count: currentClient.visit_count + 1,
            total_spent: currentClient.total_spent + saleTotal,
            last_visit_at: new Date().toISOString(),
          })
          .eq('id', clientId);
      }
    } catch (err) {
      console.error('Erreur mise à jour client après vente:', err);
    }
  };

  return {
    // State
    clients,
    selectedClient,
    invoiceInCompanyName,
    isLoading,
    error,
    // Methods
    loadClients,
    searchClients,
    getClientById,
    createClient,
    updateClient,
    selectClient,
    setInvoiceInCompanyName,
    clearSelection,
    updateClientAfterSale,
  };
}
