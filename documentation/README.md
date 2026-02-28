# 📁 Documentation technique – Scripts SQL et maintenance

**Projet :** Caisse Extrémités Homme

---

## Structure

| Dossier | Contenu |
|--------|---------|
| **migrations/** | Scripts de migration MySQL → Supabase (vendors, categories, clients, products, sales, sale_items, payments) |
| **migrations/combined/** | Fichiers SQL combinés pour `npm run migrate` |
| **sql/** | Scripts d'évolution du schéma (barcode, tiroir caisse, fidélité, etc.) |
| **maintenance/** | Scripts de nettoyage et stats (CLEANUP-TEST-*, supabase_get_sales_stats) |

---

## Migrations

Voir **MIGRATION-README.md** à la racine du projet pour :
- Configuration `.env.migration`
- Commandes `npm run migrate`, `migrate:from-sales`, `migrate:dry`
- Ordre d'exécution

---

## Maintenance

- **CLEANUP-TEST-ONLY.sql** : Supprime uniquement les données de test (garde les ventes migrées)
- **CLEANUP-TEST-DATA.sql** : Nettoyage complet (ventes, historique, caisse)
- **supabase_get_sales_stats.sql** : Crée la fonction `get_sales_stats` pour Total € et panier moyen dans l'historique

Exécuter ces scripts dans **Supabase → SQL Editor**.
