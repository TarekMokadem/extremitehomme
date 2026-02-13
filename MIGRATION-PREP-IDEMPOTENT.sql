-- ============================================================
-- PRÉPARATION MIGRATION IDEMPOTENTE (éviter les doublons)
-- À exécuter UNE FOIS si vous voulez pouvoir relancer des batches
-- sans créer de doublons (ON CONFLICT sur old_mysql_id).
-- ============================================================
-- ATTENTION: N'exécutez ce script que si sales.old_mysql_id
-- n'a pas encore de doublons. Sinon la contrainte échouera.
-- ============================================================

-- Contrainte unique sur old_mysql_id pour les ventes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'sales' AND c.conname = 'sales_old_mysql_id_key'
  ) THEN
    -- Ignorer les lignes NULL pour la contrainte
    CREATE UNIQUE INDEX IF NOT EXISTS sales_old_mysql_id_key 
    ON sales (old_mysql_id) WHERE old_mysql_id IS NOT NULL;
  END IF;
END $$;
