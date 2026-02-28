# Script SQL - Ajouter vendeur par article

Exécute ce script dans **Supabase → SQL Editor** pour permettre d'avoir un vendeur différent par article dans une vente :

```sql
-- =====================================================
-- AJOUTER LA COLONNE vendor_id À sale_items
-- =====================================================

-- Ajouter la colonne
ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_sale_items_vendor ON sale_items(vendor_id);

-- Vérification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sale_items' AND column_name = 'vendor_id';
```

## Résultat attendu

Après exécution, chaque ligne de vente (`sale_items`) pourra avoir son propre vendeur :

| Exemple | Description |
|---------|-------------|
| Thierry fait une coupe | `vendor_id` = UUID de Thierry |
| Valentin fait une décoloration | `vendor_id` = UUID de Valentin |

Cela permet de savoir **qui a réalisé chaque prestation** dans une même vente.
