-- =====================================================
-- Catégories pour produits : chaussures, produits, accessoires
-- =====================================================
-- À exécuter dans Supabase → SQL Editor
-- Inspiré de : Nos chaussures (Mocassins, Sandales, etc.) + Produits + Accessoires (Sacs)
-- =====================================================

-- Chaussures, Produits, Accessoires — les noms déjà présents sont ignorés
INSERT INTO categories (name, slug, color, display_order, is_active) VALUES
  ('Mocassins', 'mocassins', '#8B5CF6', 20, true),
  ('Sandales', 'sandales', '#F59E0B', 21, true),
  ('Souliers', 'souliers', '#3B82F6', 22, true),
  ('Bateaux', 'bateaux', '#06B6D4', 23, true),
  ('Boots & Bottines', 'boots-bottines', '#6B7280', 24, true),
  ('Tennis & Training', 'tennis-training', '#10B981', 25, true),
  ('Produits', 'produits', '#EC4899', 30, true),
  ('Accessoires', 'accessoires', '#6366F1', 40, true),
  ('Sacs', 'sacs', '#84CC16', 41, true)
ON CONFLICT (name) DO NOTHING;

SELECT 'Catégories produits / chaussures / accessoires ajoutées (doublons ignorés).' AS status;
