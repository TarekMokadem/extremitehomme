-- Migration: ajout stock technique (double gestion stock) + stock_type sur stock_movements
-- À exécuter sur Supabase

-- 1. Ajouter la colonne stock_technical au produit (le stock existant = stock de vente)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_technical integer NOT NULL DEFAULT 0;

-- 2. Ajouter la colonne stock_type aux mouvements de stock
--    'sale' = mouvement sur le stock de vente
--    'technical' = mouvement sur le stock technique
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS stock_type text NOT NULL DEFAULT 'sale';

-- 3. RLS : autoriser la lecture/écriture pour anon (maquette)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_products_all" ON products;
CREATE POLICY "anon_products_all" ON products FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_stock_movements_all" ON stock_movements;
CREATE POLICY "anon_stock_movements_all" ON stock_movements FOR ALL TO anon USING (true) WITH CHECK (true);
