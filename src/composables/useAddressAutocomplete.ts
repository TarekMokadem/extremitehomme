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

// Fetch avec timeout
const fetchWithTimeout = async (url: string, timeoutMs = 5000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

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
      // Utiliser l'API avec un timeout de 5 secondes
      const response = await fetchWithTimeout(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`,
        5000
      );

      if (!response.ok) {
        console.warn('API adresse non disponible, code:', response.status);
        suggestions.value = [];
        return [];
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
    } catch (error: any) {
      // Ne pas afficher d'erreur pour les timeouts (API souvent lente)
      if (error.name === 'AbortError') {
        console.warn('Timeout API adresse - API française temporairement indisponible');
      } else {
        console.warn('Autocomplétion adresse indisponible:', error.message);
      }
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
      const response = await fetchWithTimeout(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=municipality&limit=5`,
        5000
      );

      if (!response.ok) {
        console.warn('API ville non disponible, code:', response.status);
        suggestions.value = [];
        return [];
      }

      const data: ApiResponse = await response.json();

      suggestions.value = data.features.map((feature: ApiFeature) => ({
        label: feature.properties.label,
        city: feature.properties.city || feature.properties.name,
        postcode: feature.properties.postcode,
        street: '',
        context: feature.properties.context,
      }));

      return suggestions.value;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Timeout API ville');
      } else {
        console.warn('Autocomplétion ville indisponible:', error.message);
      }
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

