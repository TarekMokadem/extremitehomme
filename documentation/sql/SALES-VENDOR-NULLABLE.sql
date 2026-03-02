-- Permettre les ventes sans vendeur sélectionné
-- À exécuter dans Supabase SQL Editor

ALTER TABLE sales ALTER COLUMN vendor_id DROP NOT NULL;
