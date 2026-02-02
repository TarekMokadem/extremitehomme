-- ============================================================
-- MIGRATION 00: NETTOYAGE DES DONNÉES DE TEST
-- À exécuter AVANT la migration
-- ============================================================

-- Désactiver temporairement les vérifications de clés étrangères
SET session_replication_role = 'replica';

-- Supprimer les données dans l'ordre inverse des dépendances
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE loyalty_transactions CASCADE;
TRUNCATE TABLE cash_movements CASCADE;
TRUNCATE TABLE cash_registers CASCADE;
TRUNCATE TABLE daily_closures CASCADE;
TRUNCATE TABLE stock_movements CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE sale_items CASCADE;
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE product_variants CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE clients CASCADE;
TRUNCATE TABLE vendors CASCADE;
TRUNCATE TABLE settings CASCADE;

-- Réactiver les vérifications de clés étrangères
SET session_replication_role = 'origin';

-- Supprimer les tables de mapping si elles existent (migration précédente)
DROP TABLE IF EXISTS migration_vendor_mapping;
DROP TABLE IF EXISTS migration_category_mapping;
DROP TABLE IF EXISTS migration_client_mapping;
DROP TABLE IF EXISTS migration_product_mapping;
DROP TABLE IF EXISTS migration_sale_mapping;

-- Vérification : toutes les tables doivent être vides
SELECT 'vendors' as table_name, COUNT(*) as count FROM vendors
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'sales', COUNT(*) FROM sales
UNION ALL SELECT 'sale_items', COUNT(*) FROM sale_items
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'settings', COUNT(*) FROM settings;
