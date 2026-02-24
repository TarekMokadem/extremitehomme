/**
 * NF525 – Utilitaires de conformité
 *
 * Chaînage cryptographique SHA-256, Grand Total (GT),
 * et vérification d'intégrité des ventes.
 */

/**
 * Calcule le SHA-256 d'une chaîne de caractères via Web Crypto API.
 */
export async function computeSHA256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Construit la chaîne source puis calcule le hash SHA-256 d'une vente.
 *
 * Source = ticket_number | created_at (ISO) | total (2 décimales) | previous_hash
 * Si previous_hash est null (première vente), on utilise la chaîne vide.
 */
export async function computeSaleHash(
  ticketNumber: string,
  createdAt: string,
  total: number,
  previousHash: string | null,
): Promise<string> {
  const source = [
    ticketNumber,
    createdAt,
    total.toFixed(2),
    previousHash ?? '',
  ].join('|');
  return computeSHA256(source);
}

/**
 * Construit et calcule le hash SHA-256 d'une clôture journalière.
 */
export async function computeClosureHash(
  closureDate: string,
  totalSales: number,
  totalTTC: number,
  previousHash: string | null,
): Promise<string> {
  const source = [
    closureDate,
    totalSales.toString(),
    totalTTC.toFixed(2),
    previousHash ?? '',
  ].join('|');
  return computeSHA256(source);
}

/**
 * Construit et calcule le hash SHA-256 d'une entrée d'audit.
 */
export async function computeAuditHash(
  timestamp: string,
  eventType: string,
  tableName: string,
  recordId: string | null,
  previousHash: string | null,
): Promise<string> {
  const source = [
    timestamp,
    eventType,
    tableName,
    recordId ?? '',
    previousHash ?? '',
  ].join('|');
  return computeSHA256(source);
}
