-- ============================================================
-- MIGRATION MASTER - Extrémités Homme
-- De MySQL vers Supabase PostgreSQL
-- ============================================================
-- 
-- Ce fichier décrit l'ordre d'exécution de la migration.
-- Les fichiers individuels sont dans le dossier migration_output/
--
-- IMPORTANT: Exécuter les fichiers dans l'ordre suivant
-- ============================================================

-- ============================================================
-- ÉTAPE 0: PRÉPARATION (OBLIGATOIRE)
-- ============================================================
-- 
-- Exécuter ces fichiers EN PREMIER dans Supabase SQL Editor:
--
-- 1. MIGRATION-01-VENDORS.sql     → Crée les vendeurs et le mapping
-- 2. MIGRATION-02-CATEGORIES.sql  → Crée les catégories et le mapping
--

-- ============================================================
-- ÉTAPE 1: CLIENTS
-- ============================================================
-- 
-- Fichier: migration_output/01_clients.sql
-- Contenu: 3536 clients
-- 
-- Ce fichier:
-- - Ajoute une colonne temporaire old_mysql_id
-- - Insère tous les clients
-- - Crée la table de mapping migration_client_mapping
--

-- ============================================================
-- ÉTAPE 2: PRODUITS / SERVICES
-- ============================================================
-- 
-- Fichier: migration_output/02_products.sql
-- Contenu: 51 articles (services de coiffure/barbier)
-- 
-- Ce fichier:
-- - Ajoute une colonne temporaire old_mysql_id
-- - Insère tous les services
-- - Crée la table de mapping migration_product_mapping
--

-- ============================================================
-- ÉTAPE 3: VENTES (TICKETS)
-- ============================================================
-- 
-- Fichiers: migration_output/03_sales_batch_001.sql à 03_sales_batch_097.sql
-- Contenu: 48051 ventes réparties en 97 fichiers (500 par fichier)
-- 
-- ATTENTION: Ces fichiers doivent être exécutés DANS L'ORDRE
-- 
-- Pour une exécution plus simple, vous pouvez combiner les fichiers:
-- Windows PowerShell:
--   Get-Content migration_output\03_sales_batch_*.sql | Set-Content migration_output\03_sales_combined.sql
--

-- ============================================================
-- ÉTAPE 4: LIGNES DE VENTES (SALE ITEMS)
-- ============================================================
-- 
-- Fichiers: migration_output/04_sale_items_batch_001.sql à 04_sale_items_batch_061.sql
-- Contenu: 60594 lignes réparties en 61 fichiers (1000 par fichier)
-- 
-- ATTENTION: Exécuter APRÈS les ventes (étape 3)
--

-- ============================================================
-- ÉTAPE 5: PAIEMENTS
-- ============================================================
-- 
-- Fichiers: migration_output/05_payments_batch_001.sql à 05_payments_batch_049.sql
-- Contenu: 48076 paiements répartis en 49 fichiers (1000 par fichier)
-- 
-- ATTENTION: Exécuter APRÈS les ventes (étape 3)
--

-- ============================================================
-- ÉTAPE 6: NETTOYAGE (APRÈS VALIDATION)
-- ============================================================
-- 
-- Une fois la migration validée, exécuter:

/*
-- Supprimer les colonnes temporaires
ALTER TABLE clients DROP COLUMN IF EXISTS old_mysql_id;
ALTER TABLE products DROP COLUMN IF EXISTS old_mysql_id;
ALTER TABLE sales DROP COLUMN IF EXISTS old_mysql_id;

-- Supprimer les tables de mapping
DROP TABLE IF EXISTS migration_client_mapping;
DROP TABLE IF EXISTS migration_vendor_mapping;
DROP TABLE IF EXISTS migration_category_mapping;
DROP TABLE IF EXISTS migration_product_mapping;
DROP TABLE IF EXISTS migration_sale_mapping;
*/

-- ============================================================
-- VÉRIFICATION POST-MIGRATION
-- ============================================================

-- Compter les enregistrements migrés
SELECT 'vendors' as table_name, COUNT(*) as count FROM vendors
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'sales', COUNT(*) FROM sales
UNION ALL
SELECT 'sale_items', COUNT(*) FROM sale_items
UNION ALL
SELECT 'payments', COUNT(*) FROM payments;
