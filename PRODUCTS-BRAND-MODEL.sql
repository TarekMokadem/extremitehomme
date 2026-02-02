-- =====================================================
-- Colonnes marque et modèle sur la table products
-- =====================================================
-- À exécuter dans Supabase → SQL Editor
-- =====================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT;

COMMENT ON COLUMN products.brand IS 'Marque du produit';
COMMENT ON COLUMN products.model IS 'Modèle / référence';

SELECT 'Colonnes brand et model ajoutées.' AS status;
