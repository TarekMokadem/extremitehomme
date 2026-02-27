-- ============================================================
-- NETTOYAGE DES DONNÉES DE TEST
-- Extrémités Hommes - Conserve : produits, services, catégories,
-- clients migrés, vendeurs. Supprime : ventes, historique, transactions.
-- ============================================================
--
-- À GARDER :
--   - vendors (vendeurs)
--   - categories (catégories)
--   - products (services actuels + produits migrés)
--   - product_variants (variantes liées aux produits)
--   - clients (données migrées)
--   - settings (paramètres)
--
-- À SUPPRIMER :
--   - sales, sale_items, payments (ventes et paiements)
--   - stock_movements (historique mouvements stock)
--   - loyalty_transactions (fidélité)
--   - audit_logs (historique audit)
--   - cash_registers, cash_movements (tiroir caisse)
--   - daily_closures (clôtures quotidiennes)
--
-- RÉINITIALISATION :
--   - clients : loyalty_points, total_spent, visit_count, last_visit_at
--
-- OPTIONNEL : décommenter pour remettre le stock des produits à 0
--   UPDATE products SET stock = 0, stock_technical = 0 WHERE type = 'product';
--
-- ============================================================
-- Exécuter dans Supabase SQL Editor
-- ============================================================

BEGIN;

-- 1. Supprimer les données transactionnelles (ordre respectant les FK)
DELETE FROM payments;
DELETE FROM sale_items;
DELETE FROM loyalty_transactions;
DELETE FROM stock_movements;
DELETE FROM audit_logs;
DELETE FROM cash_movements;
DELETE FROM daily_closures;
DELETE FROM sales;
DELETE FROM cash_registers;

-- 2. Réinitialiser les stats clients (dérivées des ventes)
UPDATE clients SET
  loyalty_points = 0,
  total_spent = 0,
  visit_count = 0,
  last_visit_at = NULL;

-- 3. Vérification
SELECT 'payments' as table_name, COUNT(*) as count FROM payments
UNION ALL SELECT 'sale_items', COUNT(*) FROM sale_items
UNION ALL SELECT 'sales', COUNT(*) FROM sales
UNION ALL SELECT 'stock_movements', COUNT(*) FROM stock_movements
UNION ALL SELECT 'loyalty_transactions', COUNT(*) FROM loyalty_transactions
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'cash_registers', COUNT(*) FROM cash_registers
UNION ALL SELECT 'cash_movements', COUNT(*) FROM cash_movements
UNION ALL SELECT 'daily_closures', COUNT(*) FROM daily_closures;

-- Données conservées
SELECT 'vendors' as table_name, COUNT(*) as count FROM vendors
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'clients', COUNT(*) FROM clients;

COMMIT;
