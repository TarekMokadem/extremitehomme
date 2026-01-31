import { ref } from 'vue';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Client } from '../types/database';

// Type pour l'insertion (sans les champs auto-générés)
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
};

// Clients mockés pour le mode démo
const mockClients: Client[] = [
  { 
    id: '1', 
    first_name: 'Jean', 
    last_name: 'Dupont', 
    phone: '06 12 34 56 78', 
    phone2: null, 
    email: 'jean.dupont@email.com', 
    address: '123 Rue de la Paix', 
    city: 'Paris', 
    postal_code: '75001', 
    birth_date: '1985-03-15', 
    notes: 'Client fidèle', 
    loyalty_points: 150, 
    total_spent: 450.00, 
    visit_count: 15, 
    last_visit_at: '2026-01-15', 
    created_at: '', 
    updated_at: '' 
  },
  { 
    id: '2', 
    first_name: 'Marie', 
    last_name: 'Martin', 
    phone: '06 98 76 54 32', 
    phone2: '01 23 45 67 89', 
    email: 'marie.martin@email.com', 
    address: '456 Avenue des Champs', 
    city: 'Lyon', 
    postal_code: '69001', 
    birth_date: '1990-07-22', 
    notes: null, 
    loyalty_points: 75, 
    total_spent: 225.00, 
    visit_count: 8, 
    last_visit_at: '2026-01-20', 
    created_at: '', 
    updated_at: '' 
  },
  { 
    id: '3', 
    first_name: 'Pierre', 
    last_name: 'Bernard', 
    phone: '07 11 22 33 44', 
    phone2: null, 
    email: null, 
    address: null, 
    city: null, 
    postal_code: null, 
    birth_date: null, 
    notes: 'Préfère les rendez-vous le samedi', 
    loyalty_points: 30, 
    total_spent: 90.00, 
    visit_count: 3, 
    last_visit_at: '2026-01-10', 
    created_at: '', 
    updated_at: '' 
  },
];

// State global
const clients = ref<Client[]>([]);
const selectedClient = ref<Client | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

export function useClients() {
  // Charger tous les clients
  const loadClients = async () => {
    if (!isSupabaseConfigured()) {
      clients.value = mockClients;
      return;
    }

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
      clients.value = mockClients;
    } finally {
      isLoading.value = false;
    }
  };

  // Rechercher des clients
  const searchClients = async (query: string): Promise<Client[]> => {
    if (!query || query.length < 2) return [];

    if (!isSupabaseConfigured()) {
      const q = query.toLowerCase();
      return mockClients.filter(c => 
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        c.phone.includes(query) ||
        c.phone2?.includes(query)
      );
    }

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
    if (!isSupabaseConfigured()) {
      return mockClients.find(c => c.id === id) || null;
    }

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
    console.log('createClient appelé avec:', clientData);
    
    if (!isSupabaseConfigured()) {
      console.log('Mode démo - création client en mémoire');
      const newClient: Client = {
        id: `mock_${Date.now()}`,
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
        loyalty_points: 0,
        total_spent: 0,
        visit_count: 0,
        last_visit_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockClients.push(newClient);
      return newClient;
    }

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
    console.log('updateClient appelé avec:', id, updates);
    
    if (!isSupabaseConfigured()) {
      const index = mockClients.findIndex(c => c.id === id);
      if (index !== -1) {
        mockClients[index] = { ...mockClients[index], ...updates } as Client;
        return mockClients[index];
      }
      return null;
    }

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

  // Effacer la sélection
  const clearSelection = () => {
    selectedClient.value = null;
  };

  // Mettre à jour les stats après une vente
  const updateClientAfterSale = async (clientId: string, saleTotal: number) => {
    if (!isSupabaseConfigured()) {
      const client = mockClients.find(c => c.id === clientId);
      if (client) {
        client.visit_count += 1;
        client.total_spent += saleTotal;
        client.last_visit_at = new Date().toISOString();
      }
      return;
    }

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
    isLoading,
    error,
    // Methods
    loadClients,
    searchClients,
    getClientById,
    createClient,
    updateClient,
    selectClient,
    clearSelection,
    updateClientAfterSale,
  };
}
