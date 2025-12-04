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

  // Soins (uniquement ceux visibles sur l'écran d'origine)
  { id: 14, name: 'Décoloration', price: 0, duration: 45, category: 'soins' },
  { id: 15, name: 'Cover', price: 21, duration: 30, category: 'soins' },
  { id: 16, name: 'Permanente dessus de tête et coupe', price: 50, duration: 60, category: 'soins' },
  { id: 17, name: 'Permanente tête complète + coupe', price: 70, duration: 90, category: 'soins' },

  // Autres
  { id: 35, name: 'Bon cadeau', price: 0, category: 'autres' },
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
