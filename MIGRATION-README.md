# Migration des données – une seule commande

Aucun besoin d’installer **PostgreSQL** ni **psql** : le script utilise **Node.js** et le module **pg** pour exécuter les SQL.

---

## 1. Installer les dépendances

À la racine du projet :

```bash
npm install
```

(Le `package.json` contient déjà `pg` et `dotenv` pour la migration.)

---

## 2. Configurer l’URL de la base

1. Dans **Supabase** : **Settings** → **Database** → **Connection string** → onglet **URI**.
2. Copiez l’URL (avec le mot de passe), par exemple :  
   `postgresql://postgres.xxx:VOTRE_MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
3. Créez un fichier **`.env.migration`** à la racine du projet :

```env
SUPABASE_DB_URI="postgresql://postgres.xxx:VOTRE_MOT_DE_PASSE@..."
```

Vous pouvez vous inspirer de **`.env.migration.example`**.

---

## 3. Lancer les migrations (sans conflits)

- **Vous n’avez encore rien migré** (première fois) :

```bash
npm run migrate
```

- **Vous avez déjà exécuté clients + produits** (par ex. via le SQL Editor) et vous voulez seulement **ventes + lignes + paiements** :

```bash
npm run migrate:from-sales
```

- **Voir ce qui serait exécuté, sans lancer les SQL** :

```bash
npm run migrate:dry
```

---

## Ordre d’exécution (automatique)

1. **MIGRATION-PREP-IDEMPOTENT.sql** – prépare les contraintes pour éviter les doublons.
2. **combined/01_clients.sql** – clients (ignoré si vous utilisez `migrate:from-sales`).
3. **combined/02_products.sql** – produits (idem).
4. **combined/03_sales_combined.sql** – ventes (avec `ON CONFLICT (old_mysql_id) DO NOTHING`).
5. **combined/04_sale_items_combined.sql** – lignes de ventes.
6. **combined/05_payments_combined.sql** – paiements.

Les fichiers sont dans `documentation/migrations/`. Relancer tout ou une partie ne crée pas de doublons grâce au prep et aux `ON CONFLICT`.

---

## Options en ligne de commande

```bash
node run-migrations.js --from sales       # Commence à l’étape « sales »
node run-migrations.js --from sale_items # Commence aux lignes de ventes
node run-migrations.js --dry-run         # Liste les fichiers sans exécuter
```

Valeurs possibles pour `--from` : `prep`, `clients`, `products`, `sales`, `sale_items`, `payments`.

---

## En cas d’erreur

- **Variable d’environnement manquante** : vérifiez que `.env.migration` existe et contient `SUPABASE_DB_URI`.
- **Connexion refusée** : vérifiez l’URL (mot de passe, host, port 5432 ou 6543).
- **Doublons** : exécutez d’abord **MIGRATION-PREP-IDEMPOTENT.sql** dans le SQL Editor, puis relancez le script.

---

## (Optionnel) Totaux réels dans l’historique des ventes

Pour que la page **Historique des ventes** affiche le **Total €** et le **panier moyen** sur toute la base (et pas seulement sur les 1000 dernières ventes), exécutez une fois dans le **SQL Editor** Supabase le fichier **`documentation/maintenance/supabase_get_sales_stats.sql`**.
