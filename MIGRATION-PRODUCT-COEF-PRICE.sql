-- Migration : Ajouter le coefficient (coef) pour le calcul du prix de vente
-- prix_ttc = price_ht * coef (si coef défini) sinon price_ht * (1 + tva_rate)
-- Requiert PostgreSQL 13+ pour DROP EXPRESSION

-- 1. Ajouter la colonne coef
ALTER TABLE products ADD COLUMN IF NOT EXISTS coef DECIMAL(5,4);

-- 2. Convertir price_ttc de colonne générée à colonne régulière (PostgreSQL 13+)
ALTER TABLE products ALTER COLUMN price_ttc DROP EXPRESSION;

-- 3. Mettre à jour les lignes existantes
UPDATE products SET coef = 1 + tva_rate WHERE coef IS NULL;
UPDATE products SET price_ttc = price_ht * COALESCE(coef, 1 + tva_rate);

-- 4. Trigger pour maintenir price_ttc à l'insert/update
CREATE OR REPLACE FUNCTION products_compute_price_ttc()
RETURNS TRIGGER AS $$
BEGIN
  NEW.price_ttc := NEW.price_ht * COALESCE(NEW.coef, 1 + NEW.tva_rate);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_compute_price_ttc ON products;
CREATE TRIGGER trg_products_compute_price_ttc
  BEFORE INSERT OR UPDATE OF price_ht, tva_rate, coef ON products
  FOR EACH ROW EXECUTE FUNCTION products_compute_price_ttc();
