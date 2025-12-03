import { ref, computed } from 'vue';
import type { Client } from '../types';

// État global partagé
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
      if (isEditMode.value) {
        // Mode édition : mise à jour du client existant
        console.log('Mise à jour du client:', currentClient.value);
        return { 
          success: true, 
          isNew: false, 
          message: `Client ${currentClient.value.firstName} ${currentClient.value.lastName} mis à jour` 
        };
      } else {
        // Mode création : nouveau client
        // Générer un ID unique
        currentClient.value.id = `client_${Date.now()}`;
        console.log('Création du client:', currentClient.value);
        isEditMode.value = true; // Passe en mode édition après création
        return { 
          success: true, 
          isNew: true, 
          message: `Client ${currentClient.value.firstName} ${currentClient.value.lastName} créé` 
        };
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
