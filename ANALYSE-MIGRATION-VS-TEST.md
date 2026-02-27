# Analyse : Données migrées vs données de test

## Marqueurs dans le schéma

Votre base contient des **indicateurs de migration** qui permettent de distinguer les données migrées (MySQL → Supabase) des données créées après migration (tests) :

| Table | Colonne | Signification |
|-------|---------|---------------|
| `clients` | `old_mysql_id` | Client migré de l'ancienne BDD si NOT NULL |
| `products` | `old_mysql_id` | Produit migré si NOT NULL |
| `sales` | `old_mysql_id` | Vente migrée si NOT NULL |

**Tables de mapping** (lien ancien ID MySQL → nouveau UUID) :
- `migration_client_mapping` : old_id → new_id
- `migration_product_mapping` : old_id, is_article → new_id  
- `migration_sale_mapping` : old_id → new_id
- `migration_vendor_mapping` : old_id → new_id
- `migration_category_mapping` : old_name → new_id

---

## Règles de séparation

### DONNÉES MIGRÉES (à garder)

| Table | Critère |
|-------|---------|
| **vendors** | Tous (migration + éventuels ajouts) |
| **categories** | Tous |
| **clients** | `old_mysql_id IS NOT NULL` OU `id IN (SELECT new_id FROM migration_client_mapping)` |
| **products** | `old_mysql_id IS NOT NULL` OU `id IN (SELECT new_id FROM migration_product_mapping)` OU `type = 'service'` (services actuels MIGRATION-SERVICES-CAISSE) |

### DONNÉES DE TEST (à supprimer)

| Table | Critère |
|-------|---------|
| **sales** | `old_mysql_id IS NULL` ET `id NOT IN (SELECT new_id FROM migration_sale_mapping)` |
| **sale_items** | Liés aux ventes de test (à supprimer en cascade) |
| **payments** | Liés aux ventes de test |
| **stock_movements** | Tous (historique créé après migration = test) |
| **loyalty_transactions** | Tous (liés aux ventes) |
| **audit_logs** | Tous (historique) |
| **cash_registers** | Tous (tiroirs ouverts après migration) |
| **cash_movements** | Tous |
| **daily_closures** | Tous |

### CAS PARTICULIER : products

- **type = 'service'** : Services actuels (coupe, barbe, etc.) insérés par MIGRATION-SERVICES-CAISSE → **GARDER**
- **type = 'product' avec old_mysql_id** : Produits physiques migrés (chaussures, etc.) → **GARDER**
- **type = 'product' sans old_mysql_id** : Produits ajoutés manuellement après migration → **à confirmer** (test ou vrais ?)

---

## Résumé

**À supprimer :**
- Toutes les ventes de test (`sales` sans `old_mysql_id`)
- Leurs `sale_items` et `payments`
- Tous les `stock_movements`
- Tous les `loyalty_transactions`
- Tous les `audit_logs`
- Tous les `cash_registers` et `cash_movements`
- Tous les `daily_closures`

**À garder :**
- vendors, categories
- clients (migrés + éventuels nouveaux)
- products (services + produits migrés)
- settings

**À réinitialiser après suppression :**
- `clients` : loyalty_points, total_spent, visit_count, last_visit_at

---

## Fichiers générés

- **ANALYSE-MIGRATION-VS-TEST.md** (ce fichier) : explication des critères
- **CLEANUP-TEST-ONLY.sql** : script pour supprimer uniquement les données de test (garde les ventes migrées)
- **CLEANUP-TEST-DATA.sql** : script pour tout supprimer (ventes, historique, caisse) si vous préférez repartir de zéro
