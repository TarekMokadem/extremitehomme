import { ref } from 'vue';

// Types pour l'API Adresse du gouvernement français
export interface AddressSuggestion {
  label: string;
  city: string;
  postcode: string;
  street: string;
  context: string;
}

interface ApiFeature {
  properties: {
    label: string;
    name: string;
    city: string;
    postcode: string;
    context: string;
    street?: string;
  };
}

interface ApiResponse {
  features: ApiFeature[];
}

// State
const isLoading = ref(false);
const suggestions = ref<AddressSuggestion[]>([]);

export function useAddressAutocomplete() {
  /**
   * Recherche d'adresses via l'API gratuite du gouvernement français
   * Documentation: https://adresse.data.gouv.fr/api-doc/adresse
   */
  const searchAddress = async (query: string): Promise<AddressSuggestion[]> => {
    if (!query || query.length < 3) {
      suggestions.value = [];
      return [];
    }

    isLoading.value = true;

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche d\'adresse');
      }

      const data: ApiResponse = await response.json();

      suggestions.value = data.features.map((feature: ApiFeature) => ({
        label: feature.properties.label,
        city: feature.properties.city,
        postcode: feature.properties.postcode,
        street: feature.properties.street || feature.properties.name,
        context: feature.properties.context,
      }));

      return suggestions.value;
    } catch (error) {
      console.error('Erreur autocomplétion adresse:', error);
      suggestions.value = [];
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Recherche de villes uniquement
   */
  const searchCity = async (query: string): Promise<AddressSuggestion[]> => {
    if (!query || query.length < 2) {
      suggestions.value = [];
      return [];
    }

    isLoading.value = true;

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=municipality&limit=5`
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche de ville');
      }

      const data: ApiResponse = await response.json();

      suggestions.value = data.features.map((feature: ApiFeature) => ({
        label: feature.properties.label,
        city: feature.properties.city,
        postcode: feature.properties.postcode,
        street: '',
        context: feature.properties.context,
      }));

      return suggestions.value;
    } catch (error) {
      console.error('Erreur autocomplétion ville:', error);
      suggestions.value = [];
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  const clearSuggestions = (): void => {
    suggestions.value = [];
  };

  return {
    suggestions,
    isLoading,
    searchAddress,
    searchCity,
    clearSuggestions,
  };
}

