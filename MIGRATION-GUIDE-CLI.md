# Guide de migration avec Supabase / psql

Ce guide explique comment migrer les données en utilisant la ligne de commande, **sans créer de doublons** si vous avez déjà exécuté une partie des scripts.

---

## Prérequis

1. **Connexion à la base Supabase**  
   Récupérez l’URL de connexion :  
   **Supabase Dashboard** → **Settings** → **Database** → **Connection string** → **URI**  
   Exemple : `postgresql://postgres.[PROJECT_REF]:[MOT_DE_PASSE]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`

2. **Client PostgreSQL (psql)**  
   - Soit en installant [PostgreSQL](https://www.postgresql.org/download/windows/) (psql inclus)  
   - Soit via [Supabase CLI](https://supabase.com/docs/guides/cli) (pour d’autres commandes, pas pour exécuter un fichier SQL directement)

**Important :** Supabase CLI ne propose pas de commande du type “exécuter un fichier SQL”. On utilise **psql** avec l’URL de connexion Supabase.

---

## Ordre d’exécution (sans doublons)

Vous avez déjà fait :
- `01_clients.sql`
- `02_products.sql`
- Une partie des `03_sales_batch_*.sql` (ex. 001 à 040)

Donc :

1. Ne **plus** exécuter `01_clients.sql` ni `02_products.sql`.
2. Pour les **ventes** : exécuter **uniquement** les batches que vous n’avez pas encore faits (ex. 041 à 097).
3. Ensuite : **04_sale_items_combined.sql** puis **05_payments_combined.sql** (une seule fois chacun).

---

## 1. Préparation (éviter les doublons sur les ventes)

Une seule fois, dans le **SQL Editor Supabase** ou avec psql :

```sql
-- Fichier : MIGRATION-PREP-IDEMPOTENT.sql
-- Crée un index unique sur sales.old_mysql_id pour permettre ON CONFLICT
```

Exécuter le contenu de **MIGRATION-PREP-IDEMPOTENT.sql**.

Puis régénérer les fichiers de ventes pour qu’ils utilisent `ON CONFLICT (old_mysql_id) DO NOTHING` :

```powershell
python migration_script.py
powershell -ExecutionPolicy Bypass -File combine_migration_files.ps1
```

Les nouveaux `03_sales_batch_*.sql` et `03_sales_combined.sql` ne créeront plus de doublons si vous les relancez.

---

## 2. Commandes PowerShell avec psql

Remplacez `VOTRE_URI` par votre URI de connexion Supabase (avec le mot de passe).

```powershell
# Définir l'URI (mot de passe inclus)
$env:PGPASSWORD = "VOTRE_MOT_DE_PASSE"
$DB_URI = "postgresql://postgres.[PROJECT_REF]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
# Ou en mode "direct" (port 5432) :
# $DB_URI = "postgresql://postgres@db.[PROJECT_REF].supabase.co:5432/postgres"
```

### Option A : Exécuter uniquement les batches ventes manquants (ex. 041 à 097)

```powershell
cd "C:\Users\Tarek Mokadem\Desktop\Projets\Caisse maquette"

# Batches 041 à 097 (adapter selon ce que vous avez déjà fait)
41..97 | ForEach-Object {
  $n = $_.ToString("000")
  $f = "migration_output\03_sales_batch_$n.sql"
  if (Test-Path $f) {
    Write-Host "Exécution $f ..."
    psql $DB_URI -f $f
  }
}
```

### Option B : Exécuter le fichier ventes combiné (toutes les ventes d’un coup)

Si vous avez appliqué **MIGRATION-PREP-IDEMPOTENT.sql** et régénéré les scripts, vous pouvez relancer tout le fichier combiné sans doublons :

```powershell
psql $DB_URI -f "migration_combined\03_sales_combined.sql"
```

### Option C : Sale items puis payments (une fois les ventes à jour)

```powershell
psql $DB_URI -f "migration_combined\04_sale_items_combined.sql"
psql $DB_URI -f "migration_combined\05_payments_combined.sql"
```

---

## 3. Récapitulatif : quoi lancer et dans quel ordre

| Étape | Fichier | À faire ? |
|-------|---------|-----------|
| 0 | MIGRATION-PREP-IDEMPOTENT.sql | Une fois (puis régénérer les batches ventes) |
| 1 | 01_clients.sql | Déjà fait → à ignorer |
| 2 | 02_products.sql | Déjà fait → à ignorer |
| 3 | 03_sales_batch_041.sql … 097.sql | Exécuter **uniquement** les batches pas encore faits |
| 4 | 04_sale_items_combined.sql | Une fois, après toutes les ventes |
| 5 | 05_payments_combined.sql | Une fois, après les ventes |

---

## 4. Vérifications après migration

Dans le SQL Editor Supabase :

```sql
SELECT 'sales' as table_name, COUNT(*) as total FROM sales
UNION ALL SELECT 'sale_items', COUNT(*) FROM sale_items
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'mapping', COUNT(*) FROM migration_sale_mapping;
```

Vérifier qu’il n’y a pas de doublons sur les anciens IDs :

```sql
SELECT old_mysql_id, COUNT(*) 
FROM sales 
WHERE old_mysql_id IS NOT NULL 
GROUP BY old_mysql_id 
HAVING COUNT(*) > 1;
```

Si ce SELECT ne retourne aucune ligne, il n’y a pas de doublons.

---

## 5. Si vous n’avez pas psql

1. Installer PostgreSQL pour Windows : https://www.postgresql.org/download/windows/
2. Ou utiliser uniquement le **SQL Editor** du dashboard Supabase :
   - Coller le contenu de chaque fichier (ou de chaque batch) et exécuter.
   - Pour les gros fichiers (ex. 03_sales_combined.sql), exécuter batch par batch (041 à 097) pour éviter les timeouts.
