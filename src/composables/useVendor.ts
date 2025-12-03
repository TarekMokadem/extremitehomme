import { ref } from 'vue';

// Types
export interface Vendor {
  id: string;
  name: string;
  initials: string;
  color?: string;
}

// Liste des vendeurs (à remplacer par une vraie API)
const vendors: Vendor[] = [
  { id: '1', name: 'Tarek Mokadem', initials: 'TM', color: 'bg-blue-500' },
  { id: '2', name: 'Sophie Martin', initials: 'SM', color: 'bg-purple-500' },
  { id: '3', name: 'Lucas Bernard', initials: 'LB', color: 'bg-green-500' },
  { id: '4', name: 'Emma Dubois', initials: 'ED', color: 'bg-pink-500' },
];

// State global
const currentVendor = ref<Vendor>(vendors[0]);

export function useVendor() {
  const setVendor = (vendor: Vendor): void => {
    currentVendor.value = vendor;
  };

  const getVendors = (): Vendor[] => {
    return vendors;
  };

  return {
    currentVendor,
    vendors,
    setVendor,
    getVendors,
  };
}

