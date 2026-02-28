-- ============================================================
-- MIGRATION 01: Employés → Vendors
-- Source: MySQL table `employes`
-- Target: Supabase table `vendors`
-- ============================================================

-- Créer une table de mapping pour conserver les anciens IDs
CREATE TABLE IF NOT EXISTS migration_vendor_mapping (
    old_id BIGINT PRIMARY KEY,
    new_id UUID NOT NULL
);

-- Vider la table de mapping si elle existe déjà
TRUNCATE TABLE migration_vendor_mapping;

-- Insérer les vendeurs avec génération d'UUID
-- Données extraites de l'ancien système :
-- (1, 'A', 'Bruno', NULL, 1)
-- (2, 'B', 'Valentin', NULL, 1)
-- (3, 'G', 'Guy', NULL, 0)
-- (4, 'C', 'Cassandra', NULL, 0)
-- (5, 'D', 'Calogero', NULL, 0)
-- (6, 'E', 'Esthétique', NULL, 0)
-- (7, 'F', 'Thierry', NULL, 1)
-- (8, 'H', 'Furkan', NULL, 0)

-- Désactiver temporairement les contraintes si nécessaire
-- Insérer les vendeurs
INSERT INTO vendors (id, email, first_name, last_name, role, color, is_active)
VALUES 
    (gen_random_uuid(), 'bruno@extremites-homme.fr', 'Bruno', '', 'manager', '#3B82F6', true),
    (gen_random_uuid(), 'valentin@extremites-homme.fr', 'Valentin', 'Laine', 'vendor', '#10B981', true),
    (gen_random_uuid(), 'guy@extremites-homme.fr', 'Guy', '', 'vendor', '#F59E0B', false),
    (gen_random_uuid(), 'cassandra@extremites-homme.fr', 'Cassandra', '', 'vendor', '#EF4444', false),
    (gen_random_uuid(), 'calogero@extremites-homme.fr', 'Calogero', '', 'vendor', '#8B5CF6', false),
    (gen_random_uuid(), 'esthetique@extremites-homme.fr', 'Esthétique', '', 'vendor', '#EC4899', false),
    (gen_random_uuid(), 'thierry@extremites-homme.fr', 'Thierry', 'Nguyen', 'vendor', '#06B6D4', true),
    (gen_random_uuid(), 'furkan@extremites-homme.fr', 'Furkan', '', 'vendor', '#84CC16', false)
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_active = EXCLUDED.is_active;

-- Créer le mapping après insertion
-- On utilise les initiales générées automatiquement pour matcher
INSERT INTO migration_vendor_mapping (old_id, new_id)
SELECT 1, id FROM vendors WHERE first_name = 'Bruno' LIMIT 1;

INSERT INTO migration_vendor_mapping (old_id, new_id)
SELECT 2, id FROM vendors WHERE first_name = 'Valentin' LIMIT 1;

INSERT INTO migration_vendor_mapping (old_id, new_id)
SELECT 3, id FROM vendors WHERE first_name = 'Guy' LIMIT 1;

INSERT INTO migration_vendor_mapping (old_id, new_id)
SELECT 4, id FROM vendors WHERE first_name = 'Cassandra' LIMIT 1;

INSERT INTO migration_vendor_mapping (old_id, new_id)
SELECT 5, id FROM vendors WHERE first_name = 'Calogero' LIMIT 1;

INSERT INTO migration_vendor_mapping (old_id, new_id)
SELECT 6, id FROM vendors WHERE first_name = 'Esthétique' LIMIT 1;

INSERT INTO migration_vendor_mapping (old_id, new_id)
SELECT 7, id FROM vendors WHERE first_name = 'Thierry' LIMIT 1;

INSERT INTO migration_vendor_mapping (old_id, new_id)
SELECT 8, id FROM vendors WHERE first_name = 'Furkan' LIMIT 1;

-- Vérification
SELECT 'Vendors migrés:' as info, COUNT(*) as total FROM vendors;
SELECT 'Mapping créé:' as info, COUNT(*) as total FROM migration_vendor_mapping;
