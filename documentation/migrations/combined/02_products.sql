-- Migration des articles (services)
-- Généré automatiquement

-- Ajouter colonne temporaire pour le mapping
ALTER TABLE products ADD COLUMN IF NOT EXISTS old_mysql_id BIGINT;

-- Mapping des catégories
-- On utilise la catégorie "Coupe" par défaut pour les services

-- Note: price_ttc est une colonne générée, on ne l'inclut pas

-- Insertion des services
INSERT INTO products (id, code, name, type, category_id, price_ht, tva_rate, is_active, old_mysql_id)
VALUES
(gen_random_uuid(), '1', 'coupe homme', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 23.33, 0.2, true, 3),
(gen_random_uuid(), '10', 'taille+contour bi-mensuel', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 100.0, 0.2, true, 4),
(gen_random_uuid(), '11', 'cover', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 17.5, 0.2, true, 9),
(gen_random_uuid(), '99', ' (SHAMPOING)', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 16),
(gen_random_uuid(), '13', ' (SHAMPOOING HOMME / COURONNE)', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 19),
(gen_random_uuid(), '14', ' (COUPE HOMME)', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 30),
(gen_random_uuid(), '15', ' (SHAMPOOING ENFANT/-20 ANS)', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 34),
(gen_random_uuid(), '16', ' (COUPE ENFANT)', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 45),
(gen_random_uuid(), '17', ' (COUPE - 20 ANS)', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 46),
(gen_random_uuid(), '19', ' (TAILLE BARBE)', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 64),
(gen_random_uuid(), '2', 'coupe jusque 12 ans', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 13.33, 0.2, true, 66),
(gen_random_uuid(), '20', ' (COLLIER BARBE)', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 67),
(gen_random_uuid(), '21', ' (COUPE BEBE)', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 71),
(gen_random_uuid(), '23', ' (FORFAIT COLLIER)', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 73),
(gen_random_uuid(), '24', ' (FORFAIT TAILLE DE BARBE)', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 74),
(gen_random_uuid(), '3', 'coupe 12/20 ans', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 16.67, 0.2, true, 79),
(gen_random_uuid(), '4', 'coupe couronne', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 16.67, 0.2, true, 103),
(gen_random_uuid(), '5', 'taille de barbe', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 15.0, 0.2, true, 104),
(gen_random_uuid(), '6', 'taille + contour', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 20.83, 0.2, true, 137),
(gen_random_uuid(), '7', 'rasage traditionnel', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 25.0, 0.2, true, 139),
(gen_random_uuid(), '8', 'décoloration', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 140),
(gen_random_uuid(), '9', 'coupe bi-mensuelle', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 18.33, 0.2, true, 141),
(gen_random_uuid(), '28', ' (prestation soin)', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 378),
(gen_random_uuid(), '12', 'Bon cadeau', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 485),
(gen_random_uuid(), '993', 'Divers', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 483),
(gen_random_uuid(), '991', 'Ch', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 482),
(gen_random_uuid(), '990', 'Avoir', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 0.0, 0.2, true, 481),
(gen_random_uuid(), '14', 'PERMANENTE TETE COMPLETE + COUPE', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 58.33, 0.2, true, 539),
(gen_random_uuid(), '13', 'PERMANENTE DESSUS DE TETE ET COUPE', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 41.67, 0.2, true, 538),
(gen_random_uuid(), '400', 'SOIN VISAGE  30 MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 25.0, 0.2, true, 520),
(gen_random_uuid(), '401', 'SOIN VISAGE 45 MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 37.5, 0.2, true, 521),
(gen_random_uuid(), '402', 'EPILATION TORSE COMPLET 30MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 20.83, 0.2, true, 522),
(gen_random_uuid(), '403', 'EPILATION DOS COMPLET 30 MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 20.83, 0.2, true, 523),
(gen_random_uuid(), '404', 'EPILATION EPAULE 15 MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 12.5, 0.2, true, 524),
(gen_random_uuid(), '405', 'EPILATION BRAS COMPLET 30 MIN ', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 20.83, 0.2, true, 525),
(gen_random_uuid(), '406', 'EPILATION DEMI JAMBE 30 MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 20.83, 0.2, true, 526),
(gen_random_uuid(), '406', 'EPILATION VENTRE 20 MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 14.17, 0.2, true, 527),
(gen_random_uuid(), '408', 'EPILATION AISSELLES 15MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 12.5, 0.2, true, 529),
(gen_random_uuid(), '407', 'EPILATION DEMI BRAS 20MIN ', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 14.17, 0.2, true, 528),
(gen_random_uuid(), '409', 'EPILATION INTER SOURCILIER 10 MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 8.33, 0.2, true, 530),
(gen_random_uuid(), '410', 'EPILATION JAMBE COMPLETES 40 MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 29.17, 0.2, true, 531),
(gen_random_uuid(), '411', 'EPILATION SOURCIL COMPLET 20MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 16.67, 0.2, true, 532),
(gen_random_uuid(), '412', 'ZZZZZ', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 12.5, 0.2, true, 533),
(gen_random_uuid(), '413', 'MASSAGE 30MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 25.0, 0.2, true, 534),
(gen_random_uuid(), '414', 'MASSAGE 60 MIN', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 50.0, 0.2, true, 535),
(gen_random_uuid(), '415', 'SOIN ENTRETIEN DES ONGLES', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 12.5, 0.2, true, 536),
(gen_random_uuid(), '416', 'MASSAGE DES MAINS', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 16.67, 0.2, true, 537),
(gen_random_uuid(), '30', 'COUPE HOMME + TAILLE EXPRESS', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 38.33, 0.2, true, 540),
(gen_random_uuid(), '31', 'COUPE HOMME + TAILLE PRESTIGE', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 41.67, 0.2, true, 541),
(gen_random_uuid(), '32', 'COUPE COURONNE + TAILLE EXPRESS', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 29.17, 0.2, true, 542),
(gen_random_uuid(), '33', 'COUPE COURONNE + TAILLE PRESTIGE', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), 37.5, 0.2, true, 543)
ON CONFLICT DO NOTHING;

-- Créer la table de mapping
CREATE TABLE IF NOT EXISTS migration_product_mapping (
    old_id BIGINT PRIMARY KEY,
    new_id UUID NOT NULL,
    is_article BOOLEAN DEFAULT true
);

TRUNCATE TABLE migration_product_mapping;

INSERT INTO migration_product_mapping (old_id, new_id, is_article)
SELECT old_mysql_id, id, true FROM products WHERE old_mysql_id IS NOT NULL;

-- Vérification
SELECT 'Produits/Services migrés:' as info, COUNT(*) as total FROM products;
