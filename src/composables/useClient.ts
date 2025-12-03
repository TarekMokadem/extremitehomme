import { ref, computed } from 'vue';
import type { Client } from '../types';

// Client actuel
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

export function useClient() {
  /**
   * Vérifier si le client a des informations renseignées
   */
  const hasClientInfo = (): boolean => {
    return !!(
      currentClient.value.firstName.trim() ||
      currentClient.value.lastName.trim() ||
      currentClient.value.phone.trim()
    );
  };

  /**
   * Réinitialiser les données client
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
  };

  /**
   * Enregistrer le client (à implémenter avec une vraie API)
   */
  const saveClient = async (): Promise<boolean> => {
    if (!hasClientInfo()) {
      return false;
    }

    try {
      // TODO: Appel API pour enregistrer le client
      console.log('Enregistrement du client:', currentClient.value);
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du client:', error);
      return false;
    }
  };

  /**
   * Charger un client par son ID
   */
  const loadClient = (client: Client): void => {
    currentClient.value = { ...client };
  };

  return {
    currentClient,
    hasClientInfo,
    clearClient,
    saveClient,
    loadClient,
  };
}
