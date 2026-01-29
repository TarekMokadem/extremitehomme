import { ref, computed } from 'vue';
import type { Client } from '../types';
import { useClients } from './useClients';

// État global partagé (format camelCase pour le formulaire)
const currentClient = ref<Client>({
  id: '',
  firstName: '',
  lastName: '',
  phone: '',
  phone2: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
  birthDate: '',
  notes: '',
});

// Mode édition (client existant) ou création (nouveau client)
const isEditMode = ref(false);

export function useClient() {
  const { createClient, updateClient, selectClient } = useClients();

  /**
   * Vérifier si le client a des informations renseignées
   */
  const hasClientInfo = computed(() => {
    return !!(
      currentClient.value.firstName.trim() ||
      currentClient.value.lastName.trim() ||
      currentClient.value.phone.trim()
    );
  });

  /**
   * Réinitialiser les données client (passe en mode création)
   */
  const clearClient = (): void => {
    currentClient.value = {
      id: '',
      firstName: '',
      lastName: '',
      phone: '',
      phone2: '',
      email: '',
      address: '',
      city: '',
      postalCode: '',
      birthDate: '',
      notes: '',
    };
    isEditMode.value = false;
    selectClient(null);
  };

  /**
   * Charger un client existant (passe en mode édition)
   */
  const loadClient = (client: Client): void => {
    currentClient.value = { ...client };
    isEditMode.value = true;
  };

  /**
   * Créer un nouveau client vierge (passe en mode création)
   */
  const newClient = (): void => {
    clearClient();
  };

  /**
   * Enregistrer le client (création ou mise à jour selon le mode)
   */
  const saveClient = async (): Promise<{ success: boolean; isNew: boolean; message: string }> => {
    if (!hasClientInfo.value) {
      return { success: false, isNew: false, message: 'Veuillez remplir au moins un champ (nom, prénom ou téléphone)' };
    }

    // Validation du téléphone (obligatoire)
    if (!currentClient.value.phone.trim()) {
      return { success: false, isNew: false, message: 'Le numéro de téléphone est obligatoire' };
    }

    try {
      // Convertir du format camelCase (formulaire) vers snake_case (BDD)
      const clientDataForDB = {
        first_name: currentClient.value.firstName,
        last_name: currentClient.value.lastName,
        phone: currentClient.value.phone,
        phone2: currentClient.value.phone2 || null,
        email: currentClient.value.email || null,
        address: currentClient.value.address || null,
        city: currentClient.value.city || null,
        postal_code: currentClient.value.postalCode || null,
        birth_date: currentClient.value.birthDate || null,
        notes: currentClient.value.notes || null,
      };

      if (isEditMode.value && currentClient.value.id) {
        // Mode édition : mise à jour du client existant
        console.log('Mise à jour du client:', clientDataForDB);
        const result = await updateClient(currentClient.value.id, clientDataForDB);
        
        if (result) {
          // Mettre à jour le client sélectionné
          selectClient(result);
          return { 
            success: true, 
            isNew: false, 
            message: `Client ${currentClient.value.firstName} ${currentClient.value.lastName} mis à jour` 
          };
        } else {
          return { success: false, isNew: false, message: 'Erreur lors de la mise à jour' };
        }
      } else {
        // Mode création : nouveau client
        console.log('Création du client:', clientDataForDB);
        const newClientData = await createClient(clientDataForDB);
        
        if (newClientData) {
          // Mettre à jour l'ID local avec celui de la BDD
          currentClient.value.id = newClientData.id;
          isEditMode.value = true; // Passe en mode édition après création
          selectClient(newClientData);
          return { 
            success: true, 
            isNew: true, 
            message: `Client ${currentClient.value.firstName} ${currentClient.value.lastName} créé` 
          };
        } else {
          return { success: false, isNew: false, message: 'Erreur lors de la création' };
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du client:', error);
      return { success: false, isNew: false, message: 'Erreur lors de l\'enregistrement' };
    }
  };

  return {
    currentClient,
    isEditMode,
    hasClientInfo,
    clearClient,
    loadClient,
    newClient,
    saveClient,
  };
}
