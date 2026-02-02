/**
 * Formateurs de champs pour affichage et saisie (France).
 */

/** Garde uniquement les chiffres. */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Téléphone français : 10 chiffres, format XX XX XX XX XX.
 * Ex. 0612345678 → 06 12 34 56 78
 */
export function formatPhoneFR(value: string): string {
  const d = digitsOnly(value).slice(0, 10);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
  if (d.length <= 8) return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

/**
 * SIRET : 14 chiffres, format XXX XXX XXX XXXXX.
 * Ex. 12345678900012 → 123 456 789 00012
 */
export function formatSiret(value: string): string {
  const d = digitsOnly(value).slice(0, 14);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
}

/**
 * Code postal : 5 chiffres max.
 */
export function formatPostalCode(value: string): string {
  return digitsOnly(value).slice(0, 5);
}

/** Longueurs pour maxlength sur les inputs. */
export const INPUT_LENGTHS = {
  phone: 14,   // "06 12 34 56 78"
  siret: 18,   // "123 456 789 00012"
  postalCode: 5,
} as const;
