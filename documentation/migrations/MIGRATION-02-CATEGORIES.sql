-- ============================================================
-- MIGRATION 02: Catégories
-- Source: MySQL table `attribut_valeurs` (attribut_id = 8) + `articles.categorie`
-- Target: Supabase table `categories`
-- ============================================================

-- Table de mapping pour les catégories
CREATE TABLE IF NOT EXISTS migration_category_mapping (
    old_name TEXT PRIMARY KEY,
    new_id UUID NOT NULL
);

TRUNCATE TABLE migration_category_mapping;

-- Catégories extraites de l'ancien système:
-- attribut_valeurs (attr_8 = Catégorie produit):
--   Chaussure, Chaussette, Produit barbe, Produit cheveux, 
--   Shampooing, Conditioner, Gel douche, Accessoire rasage,
--   Ceinture, Portefeuille, Porte monnaie, Porte cartes, 
--   Sac, Noeud pap, Cravate, Parfum, Echarpe, Bonnet, Casquette,
--   Trousse, Produit esthetique, Accessoire chaussure, Produit chaussure
--
-- articles.categorie (services):
--   PRESTATION, ESTHETIQUE, Acomptes, Clients

-- Insérer les catégories de services
INSERT INTO categories (id, name, slug, color, display_order, is_active)
VALUES 
    -- Services (prestations barbier)
    (gen_random_uuid(), 'Coupe', 'coupe', '#3B82F6', 1, true),
    (gen_random_uuid(), 'Barbe', 'barbe', '#10B981', 2, true),
    (gen_random_uuid(), 'Forfaits', 'forfaits', '#F59E0B', 3, true),
    (gen_random_uuid(), 'Esthétique', 'esthetique', '#EC4899', 4, true),
    (gen_random_uuid(), 'Soins', 'soins', '#8B5CF6', 5, true),
    
    -- Produits - Chaussures
    (gen_random_uuid(), 'Chaussures', 'chaussures', '#6366F1', 10, true),
    (gen_random_uuid(), 'Boots', 'boots', '#7C3AED', 11, true),
    (gen_random_uuid(), 'Bottines', 'bottines', '#9333EA', 12, true),
    (gen_random_uuid(), 'Mocassins', 'mocassins', '#A855F7', 13, true),
    (gen_random_uuid(), 'Souliers', 'souliers', '#C084FC', 14, true),
    (gen_random_uuid(), 'Tennis', 'tennis', '#D946EF', 15, true),
    (gen_random_uuid(), 'Baskets', 'baskets', '#E879F9', 16, true),
    
    -- Produits - Chaussettes
    (gen_random_uuid(), 'Chaussettes', 'chaussettes', '#14B8A6', 20, true),
    
    -- Produits - Barbe/Cheveux
    (gen_random_uuid(), 'Produits Barbe', 'produits-barbe', '#F97316', 30, true),
    (gen_random_uuid(), 'Produits Cheveux', 'produits-cheveux', '#FB923C', 31, true),
    (gen_random_uuid(), 'Shampooing', 'shampooing', '#FBBF24', 32, true),
    (gen_random_uuid(), 'Gel Douche', 'gel-douche', '#FCD34D', 33, true),
    
    -- Produits - Accessoires rasage
    (gen_random_uuid(), 'Accessoires Rasage', 'accessoires-rasage', '#64748B', 40, true),
    
    -- Produits - Accessoires chaussure
    (gen_random_uuid(), 'Accessoires Chaussure', 'accessoires-chaussure', '#475569', 41, true),
    (gen_random_uuid(), 'Produits Chaussure', 'produits-chaussure', '#334155', 42, true),
    
    -- Produits - Maroquinerie
    (gen_random_uuid(), 'Ceintures', 'ceintures', '#B45309', 50, true),
    (gen_random_uuid(), 'Portefeuilles', 'portefeuilles', '#92400E', 51, true),
    (gen_random_uuid(), 'Porte-cartes', 'porte-cartes', '#78350F', 52, true),
    (gen_random_uuid(), 'Sacs', 'sacs', '#451A03', 53, true),
    
    -- Produits - Accessoires mode
    (gen_random_uuid(), 'Noeuds Papillon', 'noeuds-papillon', '#BE185D', 60, true),
    (gen_random_uuid(), 'Cravates', 'cravates', '#9D174D', 61, true),
    (gen_random_uuid(), 'Écharpes', 'echarpes', '#831843', 62, true),
    (gen_random_uuid(), 'Bonnets', 'bonnets', '#701A75', 63, true),
    (gen_random_uuid(), 'Casquettes', 'casquettes', '#86198F', 64, true),
    
    -- Divers
    (gen_random_uuid(), 'Parfums', 'parfums', '#0EA5E9', 70, true),
    (gen_random_uuid(), 'Produits Esthétique', 'produits-esthetique', '#EC4899', 71, true),
    (gen_random_uuid(), 'Divers', 'divers', '#6B7280', 99, true)
ON CONFLICT (name) DO NOTHING;

-- Créer le mapping pour les catégories principales
INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Chaussure', id FROM categories WHERE slug = 'chaussures' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Chaussette', id FROM categories WHERE slug = 'chaussettes' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Produit barbe', id FROM categories WHERE slug = 'produits-barbe' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Produit cheveux', id FROM categories WHERE slug = 'produits-cheveux' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Shampooing ', id FROM categories WHERE slug = 'shampooing' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Gel douche ', id FROM categories WHERE slug = 'gel-douche' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Accessoire rasage', id FROM categories WHERE slug = 'accessoires-rasage' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Accessoire chaussure', id FROM categories WHERE slug = 'accessoires-chaussure' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Produit chaussure ', id FROM categories WHERE slug = 'produits-chaussure' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Ceinture', id FROM categories WHERE slug = 'ceintures' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Portefeuille', id FROM categories WHERE slug = 'portefeuilles' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Porte cartes', id FROM categories WHERE slug = 'porte-cartes' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Porte monnaie', id FROM categories WHERE slug = 'portefeuilles' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Sac', id FROM categories WHERE slug = 'sacs' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Noeud pap', id FROM categories WHERE slug = 'noeuds-papillon' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Cravate', id FROM categories WHERE slug = 'cravates' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Echarpe', id FROM categories WHERE slug = 'echarpes' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Bonnet', id FROM categories WHERE slug = 'bonnets' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Casquette', id FROM categories WHERE slug = 'casquettes' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Parfum', id FROM categories WHERE slug = 'parfums' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Produit esthetique', id FROM categories WHERE slug = 'produits-esthetique' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'Trousse', id FROM categories WHERE slug = 'sacs' LIMIT 1;

-- Mapping pour les services
INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'PRESTATION', id FROM categories WHERE slug = 'coupe' LIMIT 1;

INSERT INTO migration_category_mapping (old_name, new_id)
SELECT 'ESTHETIQUE', id FROM categories WHERE slug = 'esthetique' LIMIT 1;

-- Vérification
SELECT 'Catégories migrées:' as info, COUNT(*) as total FROM categories;
SELECT 'Mapping créé:' as info, COUNT(*) as total FROM migration_category_mapping;
