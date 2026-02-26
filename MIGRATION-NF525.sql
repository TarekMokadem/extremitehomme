-- ============================================================
-- MIGRATION NF525 – Conformité caisse enregistreuse
-- À exécuter sur Supabase (SQL Editor)
-- ============================================================

-- ────────────────────────────────────────────
-- 1. Grand Total (GT) : compteur perpétuel
-- ────────────────────────────────────────────
INSERT INTO settings (key, value, description, updated_at)
VALUES (
  'grand_total',
  '0',
  'NF525 – Grand Total cumulatif (ne doit jamais être remis à zéro)',
  now()
)
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────
-- 2. Empêcher la SUPPRESSION de ventes validées
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION nf525_prevent_sale_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'NF525: Suppression interdite — vente validée %', OLD.ticket_number;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nf525_no_delete_sale ON sales;
CREATE TRIGGER trg_nf525_no_delete_sale
  BEFORE DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION nf525_prevent_sale_delete();

-- ────────────────────────────────────────────
-- 3. Empêcher la MODIFICATION des champs financiers
--    des ventes validées (seuls status + notes sont modifiables
--    pour les annulations, et hash/previous_hash pour le chaînage)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION nf525_prevent_sale_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    -- Autoriser le changement de statut (annulation) et notes
    IF NEW.ticket_number   IS DISTINCT FROM OLD.ticket_number
    OR NEW.total           IS DISTINCT FROM OLD.total
    OR NEW.subtotal_ht     IS DISTINCT FROM OLD.subtotal_ht
    OR NEW.total_tva       IS DISTINCT FROM OLD.total_tva
    OR NEW.subtotal_ttc    IS DISTINCT FROM OLD.subtotal_ttc
    OR NEW.discount_value  IS DISTINCT FROM OLD.discount_value
    OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
    OR NEW.discount_type   IS DISTINCT FROM OLD.discount_type
    OR NEW.vendor_id       IS DISTINCT FROM OLD.vendor_id
    OR NEW.client_id       IS DISTINCT FROM OLD.client_id
    THEN
      RAISE EXCEPTION 'NF525: Modification interdite — champs financiers protégés (vente %)', OLD.ticket_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nf525_no_update_sale ON sales;
CREATE TRIGGER trg_nf525_no_update_sale
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION nf525_prevent_sale_update();

-- ────────────────────────────────────────────
-- 4. Empêcher la SUPPRESSION d'articles de vente liés à une vente validée
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION nf525_prevent_sale_item_delete()
RETURNS TRIGGER AS $$
DECLARE
  sale_status text;
BEGIN
  SELECT status INTO sale_status FROM sales WHERE id = OLD.sale_id;
  IF sale_status = 'completed' THEN
    RAISE EXCEPTION 'NF525: Suppression interdite — article de vente validée';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nf525_no_delete_sale_item ON sale_items;
CREATE TRIGGER trg_nf525_no_delete_sale_item
  BEFORE DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION nf525_prevent_sale_item_delete();

-- ────────────────────────────────────────────
-- 5. Empêcher la MODIFICATION d'articles de vente liés à une vente validée
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION nf525_prevent_sale_item_update()
RETURNS TRIGGER AS $$
DECLARE
  sale_status text;
BEGIN
  SELECT status INTO sale_status FROM sales WHERE id = OLD.sale_id;
  IF sale_status = 'completed' THEN
    RAISE EXCEPTION 'NF525: Modification interdite — article de vente validée';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nf525_no_update_sale_item ON sale_items;
CREATE TRIGGER trg_nf525_no_update_sale_item
  BEFORE UPDATE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION nf525_prevent_sale_item_update();

-- ────────────────────────────────────────────
-- 6. Empêcher la SUPPRESSION / MODIFICATION de paiements liés à une vente validée
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION nf525_prevent_payment_delete()
RETURNS TRIGGER AS $$
DECLARE
  sale_status text;
BEGIN
  SELECT status INTO sale_status FROM sales WHERE id = OLD.sale_id;
  IF sale_status = 'completed' THEN
    RAISE EXCEPTION 'NF525: Suppression interdite — paiement de vente validée';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nf525_no_delete_payment ON payments;
CREATE TRIGGER trg_nf525_no_delete_payment
  BEFORE DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION nf525_prevent_payment_delete();

CREATE OR REPLACE FUNCTION nf525_prevent_payment_update()
RETURNS TRIGGER AS $$
DECLARE
  sale_status text;
BEGIN
  SELECT status INTO sale_status FROM sales WHERE id = OLD.sale_id;
  IF sale_status = 'completed' THEN
    RAISE EXCEPTION 'NF525: Modification interdite — paiement de vente validée';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nf525_no_update_payment ON payments;
CREATE TRIGGER trg_nf525_no_update_payment
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION nf525_prevent_payment_update();

-- ────────────────────────────────────────────
-- 7. Empêcher la SUPPRESSION / MODIFICATION du Grand Total
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION nf525_protect_grand_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.key = 'grand_total' THEN
    RAISE EXCEPTION 'NF525: Suppression interdite — Grand Total protégé';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.key = 'grand_total' THEN
    -- Le GT ne peut qu'augmenter
    IF (NEW.value::numeric) < (OLD.value::numeric) THEN
      RAISE EXCEPTION 'NF525: Le Grand Total ne peut pas diminuer (% -> %)', OLD.value, NEW.value;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nf525_protect_gt ON settings;
CREATE TRIGGER trg_nf525_protect_gt
  BEFORE UPDATE OR DELETE ON settings
  FOR EACH ROW
  WHEN (OLD.key = 'grand_total')
  EXECUTE FUNCTION nf525_protect_grand_total();

-- ────────────────────────────────────────────
-- 8. Empêcher la SUPPRESSION / MODIFICATION des audit_logs
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION nf525_protect_audit_logs()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'NF525: Les journaux d''audit sont immuables';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nf525_no_update_audit ON audit_logs;
CREATE TRIGGER trg_nf525_no_update_audit
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION nf525_protect_audit_logs();

DROP TRIGGER IF EXISTS trg_nf525_no_delete_audit ON audit_logs;
CREATE TRIGGER trg_nf525_no_delete_audit
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION nf525_protect_audit_logs();

-- ────────────────────────────────────────────
-- 9. RLS pour audit_logs (insert only pour anon)
-- ────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_audit_logs_select" ON audit_logs;
CREATE POLICY "anon_audit_logs_select" ON audit_logs
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_audit_logs_insert" ON audit_logs;
CREATE POLICY "anon_audit_logs_insert" ON audit_logs
  FOR INSERT TO anon WITH CHECK (true);

-- Pas de UPDATE / DELETE policy → interdit par RLS + triggers
