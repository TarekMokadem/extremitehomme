-- =====================================================
-- Colonne code-barres sur la table products
-- =====================================================
-- À exécuter dans Supabase → SQL Editor
-- Permet d'associer un code-barres à chaque produit physique
-- pour le scan à la caisse.
-- =====================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Unicité : un même code-barres ne peut être associé qu'à un produit
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique
  ON products (barcode) WHERE barcode IS NOT NULL;

-- Index pour recherche rapide par scan
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

COMMENT ON COLUMN products.barcode IS 'Code-barres (EAN, etc.) pour scan à la caisse — produits physiques uniquement';

SELECT 'Colonne barcode ajoutée.' AS status;
