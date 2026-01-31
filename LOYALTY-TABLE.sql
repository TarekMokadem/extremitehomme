# Script SQL pour la table de fidélité

Exécute ce script dans **Supabase → SQL Editor** :

```sql
-- =====================================================
-- TABLE HISTORIQUE DES POINTS DE FIDÉLITÉ
-- =====================================================

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'spent', 'expired', 'adjusted')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_loyalty_transactions_client ON loyalty_transactions(client_id);
CREATE INDEX idx_loyalty_transactions_sale ON loyalty_transactions(sale_id);
CREATE INDEX idx_loyalty_transactions_created ON loyalty_transactions(created_at DESC);

-- Row Level Security
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on loyalty_transactions"
ON loyalty_transactions FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Vérification
SELECT * FROM loyalty_transactions LIMIT 5;
```

## Types de transactions :
- `earned` : Points gagnés (tampon sur carte)
- `spent` : Points utilisés (récompense)
- `expired` : Points expirés
- `adjusted` : Ajustement manuel (admin)
