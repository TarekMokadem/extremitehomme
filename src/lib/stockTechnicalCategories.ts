/**
 * Catégories de produits qui utilisent le stock technique (consommés lors des services).
 * Pour les autres catégories (chaussures, ceintures, etc.), seul le stock de vente est géré.
 */
export const TECHNICAL_STOCK_CATEGORY_SLUGS = [
  'produits-barbe',
  'produits-cheveux',
  'shampooing',
  'gel-douche',
  'produits-chaussure',
  'parfums',
  'divers',
] as const;

export function categoryUsesTechnicalStock(slug: string | undefined | null): boolean {
  return !!slug && TECHNICAL_STOCK_CATEGORY_SLUGS.includes(slug as (typeof TECHNICAL_STOCK_CATEGORY_SLUGS)[number]);
}
