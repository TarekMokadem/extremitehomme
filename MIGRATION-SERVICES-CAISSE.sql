-- ============================================================
-- SERVICES CAISSE - Extrémités Homme
-- Remplace les services existants par ceux de l'ancienne caisse
-- ============================================================

-- Supprimer les anciens produits/services
DELETE FROM products WHERE type = 'service';

-- Récupérer l'ID de la catégorie "Coupe" (ou en créer une)
DO $$
DECLARE
    cat_coupe_id UUID;
    cat_barbe_id UUID;
    cat_forfait_id UUID;
BEGIN
    -- Trouver ou créer les catégories
    SELECT id INTO cat_coupe_id FROM categories WHERE slug = 'coupe' LIMIT 1;
    SELECT id INTO cat_barbe_id FROM categories WHERE slug = 'barbe' LIMIT 1;
    SELECT id INTO cat_forfait_id FROM categories WHERE slug = 'forfaits' LIMIT 1;
    
    -- Si les catégories n'existent pas, les créer
    IF cat_coupe_id IS NULL THEN
        INSERT INTO categories (id, name, slug, color, display_order, is_active)
        VALUES (gen_random_uuid(), 'Coupe', 'coupe', '#3B82F6', 1, true)
        RETURNING id INTO cat_coupe_id;
    END IF;
    
    IF cat_barbe_id IS NULL THEN
        INSERT INTO categories (id, name, slug, color, display_order, is_active)
        VALUES (gen_random_uuid(), 'Barbe', 'barbe', '#10B981', 2, true)
        RETURNING id INTO cat_barbe_id;
    END IF;
    
    IF cat_forfait_id IS NULL THEN
        INSERT INTO categories (id, name, slug, color, display_order, is_active)
        VALUES (gen_random_uuid(), 'Forfaits', 'forfaits', '#F59E0B', 3, true)
        RETURNING id INTO cat_forfait_id;
    END IF;

    -- Insérer les services (prix TTC, tva_rate = 0.20)
    -- price_ht = price_ttc / 1.20
    
    -- Services Coupe
    INSERT INTO products (id, code, name, type, category_id, price_ht, tva_rate, is_active, display_order)
    VALUES
        (gen_random_uuid(), '1', 'coupe homme', 'service', cat_coupe_id, ROUND(28 / 1.20, 2), 0.20, true, 1),
        (gen_random_uuid(), '2', 'coupe jusque 12 ans', 'service', cat_coupe_id, ROUND(16 / 1.20, 2), 0.20, true, 2),
        (gen_random_uuid(), '3', 'coupe 12/20 ans', 'service', cat_coupe_id, ROUND(20 / 1.20, 2), 0.20, true, 3),
        (gen_random_uuid(), '4', 'coupe couronne', 'service', cat_coupe_id, ROUND(20 / 1.20, 2), 0.20, true, 4),
        (gen_random_uuid(), '9', 'coupe bi-mensuelle', 'service', cat_coupe_id, ROUND(22 / 1.20, 2), 0.20, true, 9);
    
    -- Services Barbe
    INSERT INTO products (id, code, name, type, category_id, price_ht, tva_rate, is_active, display_order)
    VALUES
        (gen_random_uuid(), '5', 'taille de barbe', 'service', cat_barbe_id, ROUND(18 / 1.20, 2), 0.20, true, 5),
        (gen_random_uuid(), '6', 'taille + contour', 'service', cat_barbe_id, ROUND(25 / 1.20, 2), 0.20, true, 6),
        (gen_random_uuid(), '7', 'rasage traditionnel', 'service', cat_barbe_id, ROUND(30 / 1.20, 2), 0.20, true, 7),
        (gen_random_uuid(), '10', 'taille+contour bi-mensuel', 'service', cat_barbe_id, ROUND(120 / 1.20, 2), 0.20, true, 10);
    
    -- Services Spéciaux
    INSERT INTO products (id, code, name, type, category_id, price_ht, tva_rate, is_active, display_order)
    VALUES
        (gen_random_uuid(), '8', 'décoloration', 'service', cat_coupe_id, 0, 0.20, true, 8),
        (gen_random_uuid(), '11', 'cover', 'service', cat_coupe_id, ROUND(21 / 1.20, 2), 0.20, true, 11),
        (gen_random_uuid(), '12', 'bon cadeau', 'service', cat_coupe_id, 0, 0.20, true, 12);
    
    -- Permanentes
    INSERT INTO products (id, code, name, type, category_id, price_ht, tva_rate, is_active, display_order)
    VALUES
        (gen_random_uuid(), '13', 'permanente dessus de tete et coupe', 'service', cat_coupe_id, ROUND(50 / 1.20, 2), 0.20, true, 13),
        (gen_random_uuid(), '14', 'permanente tete complete + coupe', 'service', cat_coupe_id, ROUND(70 / 1.20, 2), 0.20, true, 14);
    
    -- Forfaits Coupe + Barbe
    INSERT INTO products (id, code, name, type, category_id, price_ht, tva_rate, is_active, display_order)
    VALUES
        (gen_random_uuid(), '30', 'coupe homme + taille express', 'service', cat_forfait_id, ROUND(46 / 1.20, 2), 0.20, true, 30),
        (gen_random_uuid(), '31', 'coupe homme + taille prestige', 'service', cat_forfait_id, ROUND(50 / 1.20, 2), 0.20, true, 31),
        (gen_random_uuid(), '32', 'coupe couronne + taille express', 'service', cat_forfait_id, ROUND(35 / 1.20, 2), 0.20, true, 32),
        (gen_random_uuid(), '33', 'coupe couronne + taille prestige', 'service', cat_forfait_id, ROUND(45 / 1.20, 2), 0.20, true, 33);
        
END $$;

-- Vérification
SELECT code, name, price_ht, tva_rate, price_ttc, display_order 
FROM products 
WHERE type = 'service' 
ORDER BY display_order;
