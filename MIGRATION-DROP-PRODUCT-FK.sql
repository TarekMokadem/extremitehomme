-- Migration : Supprimer les contraintes FK product_id pour permettre la suppression des produits
-- Les transactions (sale_items) conservent product_id comme simple référence (UUID) sans lien FK.
-- L'historique des ventes reste intact : product_name, price_ht, etc. sont déjà stockés dans sale_items.

-- 1. sale_items : supprimer la FK product_id -> products
-- Les lignes de vente gardent product_id (UUID) pour traçabilité, mais ne bloquent plus la suppression
ALTER TABLE sale_items
  DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey;

-- 2. stock_movements : supprimer la FK product_id -> products
-- Les mouvements de stock gardent product_id pour l'historique
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_product_id_fkey;

-- Note : product_variants a déjà ON DELETE CASCADE, les variantes sont supprimées avec le produit.
