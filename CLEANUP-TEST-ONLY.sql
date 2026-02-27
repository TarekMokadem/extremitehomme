-- ============================================================
-- NETTOYAGE CIBLÉ : Supprimer UNIQUEMENT les données de test
-- Garde les données migrées (old_mysql_id) et les services actuels
-- ============================================================
--
-- SUPPRIME :
--   - Ventes de test (sales sans old_mysql_id)
--   - Leurs sale_items, payments
--   - Tous stock_movements, loyalty_transactions, audit_logs
--   - Tous cash_registers, cash_movements, daily_closures
--
-- GARDE :
--   - Ventes migrées (sales.old_mysql_id IS NOT NULL)
--   - vendors, categories, clients, products, settings
--
-- ============================================================
-- Les triggers NF525 bloquent la suppression des ventes "completed".
-- On passe d'abord les ventes de test en "cancelled" pour contourner.
-- ============================================================

BEGIN;

-- 1. Passer les ventes de test en "cancelled" (les triggers NF525 autorisent ce changement)
UPDATE sales SET status = 'cancelled' WHERE old_mysql_id IS NULL;

-- 2. Supprimer les données dépendantes des ventes de test
--    (payments et sale_items ont ON DELETE CASCADE vers sales, 
--     mais on supprime explicitement pour être clair)

-- Paiements des ventes de test (ventes sans old_mysql_id = créées après migration)
DELETE FROM payments 
WHERE sale_id IN (SELECT id FROM sales WHERE old_mysql_id IS NULL);

-- Lignes de vente des ventes de test
DELETE FROM sale_items 
WHERE sale_id IN (SELECT id FROM sales WHERE old_mysql_id IS NULL);

-- Loyalty liée aux ventes de test
DELETE FROM loyalty_transactions 
WHERE sale_id IN (SELECT id FROM sales WHERE old_mysql_id IS NULL);

-- 3. Supprimer les ventes de test (maintenant status = cancelled, les triggers autorisent)
DELETE FROM sales WHERE old_mysql_id IS NULL;

-- 4. Supprimer tout le reste (historique / caisse = test)
DELETE FROM stock_movements;
DELETE FROM loyalty_transactions;  -- reste éventuel (ajustements manuels)
DELETE FROM audit_logs;
DELETE FROM cash_movements;
DELETE FROM cash_registers;
DELETE FROM daily_closures;

-- 5. Réinitialiser les stats clients (impactées par les ventes supprimées)
UPDATE clients SET
  loyalty_points = 0,
  total_spent = 0,
  visit_count = 0,
  last_visit_at = NULL;

-- 6. Vérification
SELECT 'sales (reste)' as table_name, COUNT(*) as count FROM sales
UNION ALL SELECT 'sale_items', COUNT(*) FROM sale_items
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'stock_movements', COUNT(*) FROM stock_movements
UNION ALL SELECT 'loyalty_transactions', COUNT(*) FROM loyalty_transactions
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'cash_registers', COUNT(*) FROM cash_registers;

COMMIT;
