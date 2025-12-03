import type { Service } from '../types';

export const services: Service[] = [
  // Coupes
  { id: 1, name: 'Coupe homme', price: 28, duration: 30, category: 'coupes' },
  { id: 2, name: 'Coupe jusque 12 ans', price: 10, duration: 20, category: 'coupes' },
  { id: 3, name: 'Coupe 12/20 ans', price: 20, duration: 25, category: 'coupes' },
  { id: 4, name: 'Coupe couronne', price: 20, duration: 20, category: 'coupes' },
  { id: 5, name: 'Coupe bi-mensuelle', price: 22, duration: 25, category: 'coupes' },
  { id: 6, name: 'Coupe homme + taille express', price: 46, duration: 45, category: 'coupes' },
  { id: 7, name: 'Coupe homme + taille prestige', price: 50, duration: 50, category: 'coupes' },
  { id: 8, name: 'Coupe couronne + taille express', price: 35, duration: 35, category: 'coupes' },
  { id: 9, name: 'Coupe couronne + taille prestige', price: 45, duration: 45, category: 'coupes' },

  // Barbe
  { id: 10, name: 'Taille de barbe', price: 18, duration: 15, category: 'barbe' },
  { id: 11, name: 'Taille + contour', price: 25, duration: 20, category: 'barbe' },
  { id: 12, name: 'Rasage traditionnel', price: 30, duration: 30, category: 'barbe' },
  { id: 13, name: 'Taille + contour bi-mensuel', price: 120, duration: 20, category: 'barbe' },

  // Soins
  { id: 15, name: 'Cover', price: 21, duration: 30, category: 'soins' },
  { id: 16, name: 'Permanente dessus de tête et coupe', price: 50, duration: 60, category: 'soins' },
  { id: 17, name: 'Permanente tête complète + coupe', price: 70, duration: 90, category: 'soins' },
  { id: 18, name: 'Soin visage 30 min', price: 30, duration: 30, category: 'soins' },
  { id: 19, name: 'Soin visage 45 min', price: 45, duration: 45, category: 'soins' },
  { id: 20, name: 'Soin entretien des ongles', price: 15, duration: 20, category: 'soins' },

  // Épilation
  { id: 21, name: 'Épilation torse complet 30min', price: 25, duration: 30, category: 'epilation' },
  { id: 22, name: 'Épilation dos complet 30min', price: 25, duration: 30, category: 'epilation' },
  { id: 23, name: 'Épilation épaule 15min', price: 15, duration: 15, category: 'epilation' },
  { id: 24, name: 'Épilation bras complet 30min', price: 25, duration: 30, category: 'epilation' },
  { id: 25, name: 'Épilation ventre 20min', price: 17, duration: 20, category: 'epilation' },
  { id: 26, name: 'Épilation demi bras 20min', price: 17, duration: 20, category: 'epilation' },
  { id: 27, name: 'Épilation aisselles 15min', price: 15, duration: 15, category: 'epilation' },
  { id: 28, name: 'Épilation inter-sourcilier 10min', price: 10, duration: 10, category: 'epilation' },
  { id: 29, name: 'Épilation jambe complètes 40min', price: 35, duration: 40, category: 'epilation' },
  { id: 30, name: 'Épilation demi jambe 30min', price: 25, duration: 30, category: 'epilation' },
  { id: 31, name: 'Épilation sourcil complet 20min', price: 20, duration: 20, category: 'epilation' },

  // Massage
  { id: 32, name: 'Massage 30min', price: 30, duration: 30, category: 'massage' },
  { id: 33, name: 'Massage 60min', price: 60, duration: 60, category: 'massage' },
  { id: 34, name: 'Massage des mains', price: 20, duration: 15, category: 'massage' },

  // Autres
  // (services non utilisés dans la nouvelle caisse volontairement retirés)
];

/**
 * Récupère les services par catégorie
 */
export function getServicesByCategory(categoryId: string): Service[] {
  if (categoryId === 'all') {
    return services;
  }
  return services.filter(service => service.category === categoryId);
}

/**
 * Recherche de services par nom
 */
export function searchServices(query: string): Service[] {
  const lowerQuery = query.toLowerCase();
  return services.filter(service =>
    service.name.toLowerCase().includes(lowerQuery)
  );
}
