-- =====================================================
-- RLS SETTINGS : autoriser lecture/écriture pour l'app
-- =====================================================
-- À exécuter dans Supabase → SQL Editor
-- Corrige l'erreur : "new row violates row-level security policy for table settings"
-- =====================================================

-- Supprimer l'ancienne politique restrictive (admin uniquement)
DROP POLICY IF EXISTS "Only admins can modify settings" ON settings;

-- Nouvelle politique : tout le monde (anon + authenticated) peut lire et modifier les paramètres
-- Cohérent avec le reste de l'app (clients, ventes, etc.) en usage interne.
CREATE POLICY "Settings are manageable by all"
    ON settings FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Vérification
SELECT 'RLS settings mis à jour : lecture et écriture autorisées.' AS status;
