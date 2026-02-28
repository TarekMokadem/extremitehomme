# Script SQL - Tiroir de caisse

Exécute ce script dans **Supabase → SQL Editor** :

```sql
-- =====================================================
-- TABLES TIROIR DE CAISSE
-- =====================================================

-- Table des sessions de caisse (ouverture/fermeture)
CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  vendor_id UUID REFERENCES vendors(id),
  opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- Fond de caisse
  closing_amount DECIMAL(10,2), -- Montant réel à la fermeture
  expected_amount DECIMAL(10,2), -- Montant théorique calculé
  difference DECIMAL(10,2), -- Écart (réel - théorique)
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des mouvements de caisse (entrées/sorties manuelles)
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')), -- in = entrée, out = sortie/dépense
  amount DECIMAL(10,2) NOT NULL,
  label TEXT NOT NULL, -- Libellé (ex: "Achat fournitures", "Retrait banque")
  vendor_id UUID REFERENCES vendors(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_cash_registers_date ON cash_registers(date DESC);
CREATE INDEX idx_cash_registers_status ON cash_registers(status);
CREATE INDEX idx_cash_movements_register ON cash_movements(cash_register_id);

-- Row Level Security
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on cash_registers"
ON cash_registers FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all on cash_movements"
ON cash_movements FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Vérification
SELECT 'cash_registers' as table_name, count(*) FROM cash_registers
UNION ALL
SELECT 'cash_movements', count(*) FROM cash_movements;
```

## Structure

### cash_registers (sessions de caisse)
| Champ | Description |
|-------|-------------|
| `date` | Date de la caisse |
| `opening_amount` | Fond de caisse à l'ouverture |
| `closing_amount` | Montant réel compté à la fermeture |
| `expected_amount` | Montant théorique (fond + ventes espèces - sorties) |
| `difference` | Écart (réel - théorique) |
| `status` | `open` ou `closed` |

### cash_movements (mouvements)
| Champ | Description |
|-------|-------------|
| `type` | `in` (entrée) ou `out` (sortie/dépense) |
| `amount` | Montant |
| `label` | Libellé (ex: "Achat café", "Retrait banque") |
