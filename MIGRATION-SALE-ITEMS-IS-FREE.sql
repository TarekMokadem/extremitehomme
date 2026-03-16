-- Migration : Ajouter is_free à sale_items pour articles passés en gratuit
-- Exécuter dans Supabase → SQL Editor
-- Permet de stocker le CA théorique des articles gratuits (catégorie Gratuit en fin de journée)

ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT false;

COMMENT ON COLUMN sale_items.is_free IS 'Article passé en gratuit : subtotal_ttc contient le montant théorique pour reporting';
