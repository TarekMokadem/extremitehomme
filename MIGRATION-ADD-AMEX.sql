-- Migration : Ajouter American Express comme moyen de paiement
-- Exécuter dans Supabase → SQL Editor

-- Ajouter 'amex' à l'enum payment_method
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'amex'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')
  ) THEN
    ALTER TYPE payment_method ADD VALUE 'amex';
  END IF;
END
$$;
