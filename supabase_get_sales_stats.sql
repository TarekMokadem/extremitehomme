-- Optionnel : statistiques globales pour l'historique des ventes
-- Exécuter dans Supabase SQL Editor pour que Total € et panier moyen reflètent toute la base.

CREATE OR REPLACE FUNCTION get_sales_stats(p_start_date timestamptz DEFAULT NULL)
RETURNS TABLE(total_count bigint, total_amount numeric, avg_ticket numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*)::bigint,
    COALESCE(SUM(total), 0),
    COALESCE(AVG(total), 0)
  FROM sales
  WHERE (p_start_date IS NULL OR created_at >= p_start_date);
$$;
