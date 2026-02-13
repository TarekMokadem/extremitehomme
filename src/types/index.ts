// Types pour les services
export interface Service {
  id: number;
  name: string;
  price: number;
  duration?: number; // en minutes
  category: string;
}

// Types pour le panier
export interface CartItem {
  service: Service;
  quantity: number;
}

// Types pour les clients
export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  phone2?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  birthDate?: string;
  notes?: string;
  /** Nom de l'entreprise (optionnel) */
  company?: string;
}

// Types pour les moyens de paiement
export type PaymentMethod = 'cash' | 'card' | 'contactless' | 'check' | 'gift_card' | 'amex';

// Types pour les catégories
export interface Category {
  id: string;
  label: string;
  borderColor: string;
}

export const CATEGORIES: Category[] = [
  { id: 'coupes', label: 'Coupes', borderColor: 'border-blue-500' },
  { id: 'barbe', label: 'Barbe', borderColor: 'border-amber-500' },
  { id: 'soins', label: 'Soins', borderColor: 'border-emerald-500' },
  { id: 'epilation', label: 'Épilation', borderColor: 'border-rose-500' },
  { id: 'massage', label: 'Massage', borderColor: 'border-purple-500' },
  { id: 'autres', label: 'Autres', borderColor: 'border-gray-400' },
];
