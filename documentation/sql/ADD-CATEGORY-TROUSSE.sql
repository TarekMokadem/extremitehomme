-- =====================================================
-- Ajout de la catégorie "Trousse" (sans taille)
-- =====================================================
-- À exécuter dans Supabase → SQL Editor
-- =====================================================

INSERT INTO categories (name, slug, color, display_order, is_active)
VALUES ('Trousse', 'trousses', '#F97316', 42, true)
ON CONFLICT (name) DO NOTHING;

SELECT 'Catégorie Trousse ajoutée (doublon ignoré).' AS status;
