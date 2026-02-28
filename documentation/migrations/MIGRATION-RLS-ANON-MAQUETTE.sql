-- Migration : Autoriser l'accès sans connexion (mode maquette/démo)
-- À utiliser pour développer ou tester sans configurer Supabase Auth.
-- En production, préférez une authentification réelle.

-- vendors : anon peut lire (pour charger le vendeur par défaut)
DROP POLICY IF EXISTS "Vendors viewable by anon for maquette" ON vendors;
CREATE POLICY "Vendors viewable by anon for maquette"
    ON vendors FOR SELECT
    TO anon
    USING (true);

-- categories : anon peut lire (pour les formulaires produit)
DROP POLICY IF EXISTS "Categories viewable by anon for maquette" ON categories;
CREATE POLICY "Categories viewable by anon for maquette"
    ON categories FOR SELECT
    TO anon
    USING (true);

-- stock_movements : anon peut insérer et lire (pour les mouvements de stock)
DROP POLICY IF EXISTS "Stock movements allow anon for maquette" ON stock_movements;
CREATE POLICY "Stock movements allow anon for maquette"
    ON stock_movements FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- products : anon peut lire et modifier (pour addMovement, createProduct, etc.)
DROP POLICY IF EXISTS "Products viewable by anon for maquette" ON products;
CREATE POLICY "Products viewable by anon for maquette"
    ON products FOR SELECT
    TO anon
    USING (true);

-- products : anon peut modifier (INSERT, UPDATE, DELETE pour stock et ajout produit)
DROP POLICY IF EXISTS "Products insertable by anon for maquette" ON products;
DROP POLICY IF EXISTS "Products updatable by anon for maquette" ON products;
DROP POLICY IF EXISTS "Products deletable by anon for maquette" ON products;
CREATE POLICY "Products insertable by anon for maquette"
    ON products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Products updatable by anon for maquette"
    ON products FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Products deletable by anon for maquette"
    ON products FOR DELETE TO anon USING (true);
