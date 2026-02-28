-- Migration : Taille produit + Prix TTC éditable (sans coef en BDD)
-- Le coef est calculé côté front : Prix de vente / Prix HT

-- 1. Ajouter la colonne size
ALTER TABLE products ADD COLUMN IF NOT EXISTS size TEXT;

-- 2. Supprimer le trigger AVANT la colonne coef (le trigger en dépend)
DROP TRIGGER IF EXISTS trg_products_compute_price_ttc ON products;
ALTER TABLE products DROP COLUMN IF EXISTS coef;

-- 3. Convertir price_ttc en colonne éditable si générée (PostgreSQL 15+)
--    Si erreur, ignorer (colonne déjà régulière)
DO $$
BEGIN
  ALTER TABLE products ALTER COLUMN price_ttc DROP EXPRESSION;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4. Mettre à jour les lignes existantes si price_ttc vide
UPDATE products SET price_ttc = price_ht * (1 + COALESCE(tva_rate, 0.2))
WHERE price_ttc IS NULL OR price_ttc = 0;
