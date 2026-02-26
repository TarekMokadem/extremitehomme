/**
 * Composable pour la capture du scan code-barres.
 *
 * Les lecteurs USB/Bluetooth agissent comme un clavier : ils "tapent"
 * le code puis envoient Entrée. Ce composable fournit la logique
 * pour détecter un scan (saisie rapide + Enter) et le callback associé.
 */

import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Détecte si une chaîne ressemble à un code-barres (EAN-13, UPC-A, etc.)
 */
export function looksLikeBarcode(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 6 || trimmed.length > 20) return false;
  return /^\d+$/.test(trimmed);
}

/**
 * Hook pour capturer le scan sur un input.
 * Appelle onScan(barcode) quand l'utilisateur appuie sur Enter
 * et que la valeur ressemble à un code-barres.
 */
export function useBarcodeScanInput(onScan: (barcode: string) => void | Promise<void>) {
  const inputValue = ref('');

  const handleKeydown = async (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const code = inputValue.value.trim();
    if (!code) return;
    e.preventDefault();
    if (looksLikeBarcode(code)) {
      await onScan(code);
      inputValue.value = '';
    }
  };

  return { inputValue, handleKeydown };
}
