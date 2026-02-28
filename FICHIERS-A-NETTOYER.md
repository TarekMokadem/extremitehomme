# 🧹 Nettoyage effectué – Livraison client

**Projet :** Caisse Extrémités Homme  
**Date :** 29 janvier 2026  
**Statut :** ✅ Nettoyage terminé

---

## ✅ Actions réalisées

### 1. Supprimé
- **migration_output/** (~220 fichiers) – Lots de migration déjà exécutés
- **combine_migration_files.ps1** – Script PowerShell obsolète
- **run_migration_remaining.ps1** – Script PowerShell obsolète
- **migration_script.py** – Script Python de génération des lots
- **backfill_barcodes.py** – Script Python de backfill codes-barres

### 2. Déplacé vers `documentation/`

| Destination | Fichiers |
|-------------|----------|
| **documentation/migrations/** | MIGRATION-*.sql (15 fichiers), ANALYSE-MIGRATION-VS-TEST.md |
| **documentation/migrations/combined/** | 01_clients.sql, 02_products.sql, 03_sales_combined.sql, 04_sale_items_combined.sql, 05_payments_combined.sql |
| **documentation/sql/** | PRODUCTS-BARCODE.sql, PRODUCTS-BRAND-MODEL.sql, CATEGORIES-PRODUITS-CHAUSSURES.sql, CLIENTS-COMPANY.sql, SETTINGS-RLS.sql, TIROIR-CAISSE-TABLE.sql, LOYALTY-TABLE.sql, SALE-ITEMS-VENDOR.sql |
| **documentation/maintenance/** | CLEANUP-TEST-DATA.sql, CLEANUP-TEST-ONLY.sql, supabase_get_sales_stats.sql |

### 3. Mis à jour
- **run-migrations.js** – Chemins vers `documentation/migrations/`
- **MIGRATION-README.md** – Chemins et référence à supabase_get_sales_stats
- **README.md** – Référence au dossier documentation
- **START-HERE.md**, **INDEX.md**, **QUICK-REFERENCE.md**, **FILES-OVERVIEW.md** – Suppression des références à NEXT-STEPS.md (remplacé par SUPABASE-SETUP.md, MIGRATION-README.md)

---

## 📂 Structure actuelle

```
Caisse maquette/
├── documentation/
│   ├── README.md
│   ├── migrations/          # Scripts migration + combined/
│   ├── sql/                # Évolution schéma
│   └── maintenance/        # Nettoyage, stats
├── docs/                   # Build Vite (GitHub Pages)
├── src/
├── run-migrations.js       # npm run migrate
└── ...
```

---

## 📝 Fichiers déplacés

- **dump.sql** → `documentation/dump.sql` (dump schéma Supabase)
- **DB extremite homme.sql** → `documentation/` (si présent)

---

## 🔧 Scripts npm inchangés

```bash
npm run migrate           # Migration complète
npm run migrate:from-sales
npm run migrate:dry
```
