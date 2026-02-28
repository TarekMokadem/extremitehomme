-- =====================================================
-- Colonne entreprise (company) sur la table clients
-- =====================================================
-- À exécuter dans Supabase → SQL Editor
-- =====================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS company TEXT;

COMMENT ON COLUMN clients.company IS 'Nom de l''entreprise du client (optionnel, pour facturation)';

SELECT 'Colonne company ajoutée.' AS status;
