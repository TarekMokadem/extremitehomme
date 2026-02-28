# 💼 Extrémités Homme - Système de Caisse

Application de caisse moderne pour salon de coiffure et barbier, développée avec Vue 3, TypeScript, TailwindCSS et Supabase.

## ✨ Fonctionnalités

### 🏪 Page Caisse
- **Sélection du vendeur** : Menu déroulant dans le header
- **Grille de services** : Produits et services chargés depuis Supabase, recherche et filtres par catégorie
- **Panier** : Ajout/suppression, modification des quantités, calcul HT/TVA/TTC
- **Réductions** : Mode € (euros) ou % (pourcentage)
- **Paiements** : Espèces, CB, Sans contact, American Express, Chèque, Carte cadeau
- **Validation** : Enregistrement des ventes en base de données

### 👥 Page Clients
- Liste des clients avec recherche
- Fiche détaillée : coordonnées, stats (total dépensé, visites, points fidélité)
- Historique des achats avec détail des produits/services
- Carte de fidélité (points tampons)
- Création, modification, suppression

### 📜 Page Historique
- Liste des ventes avec filtres par date
- Détail des ventes (articles, montant, mode de paiement)
- Modification du mode de paiement d'une vente

### 📦 Page Stock
- Gestion des produits et variantes
- Alertes de stock
- Mouvements d'inventaire

### 📊 Page Statistiques
- Graphiques et indicateurs de ventes
- Analyse par service/produit

### 💵 Page Tiroir de Caisse
- Ouverture/fermeture de caisse
- Mouvements (entrées/sorties)
- Rapprochement espèces

### ⚙️ Page Paramètres
- Configuration de l'application

### 📋 Page Commande
- Gestion des commandes fournisseurs

### 🎨 Interface
- **Thème sombre** : Bascule clair/sombre
- **Responsive** : Adapté mobile et desktop
- **Navigation** : Vue Router avec 8 pages

### 🔍 Recherche & Autocomplétion
- **Services** : Recherche en temps réel, suggestions dès 2 caractères
- **Clients** : Par nom, prénom, téléphone
- **Adresses** : API gouvernementale française (api-adresse.data.gouv.fr) - gratuite, sans clé

## 🏗️ Architecture Technique

### Stack
- **Vue 3** - Framework progressif
- **TypeScript** - Typage fort
- **TailwindCSS v4** - Styling utility-first
- **Vite** - Build tool
- **Supabase** - Backend as a Service (PostgreSQL, Auth, Realtime)
- **Lucide Vue** - Icônes SVG

### Structure du projet

```
src/
├── components/           # Composants réutilisables
│   ├── AppHeader.vue     # En-tête + vendeur + navigation
│   ├── TicketPanel.vue   # Panier + paiement
│   ├── ServiceGrid.vue   # Grille des services
│   ├── ServiceCard.vue    # Carte de service
│   ├── ClientPanel.vue    # Formulaire client
│   ├── CartPanel.vue      # Panier (mode alternatif)
│   └── LoyaltyCard.vue    # Carte fidélité
│
├── pages/                # Pages de l'application
│   ├── CaissePage.vue     # Page principale caisse
│   ├── ClientsPage.vue    # Gestion clients
│   ├── HistoriquePage.vue # Historique des ventes
│   ├── StockPage.vue      # Gestion stock
│   ├── StatistiquesPage.vue
│   ├── TiroirCaissePage.vue
│   ├── ParametresPage.vue
│   └── CommandePage.vue
│
├── composables/          # Logique métier
│   ├── useCart.ts        # Panier
│   ├── useSales.ts       # Ventes (Supabase)
│   ├── useProducts.ts    # Produits (Supabase)
│   ├── useClients.ts     # Clients (Supabase)
│   ├── useClient.ts      # Client courant
│   ├── useVendor.ts      # Vendeurs
│   ├── useLoyalty.ts     # Fidélité
│   ├── useStock.ts       # Stock
│   ├── useCashRegister.ts # Tiroir de caisse
│   ├── useAuth.ts        # Authentification
│   ├── useTheme.ts       # Thème clair/sombre
│   └── useAddressAutocomplete.ts
│
├── lib/                  # Bibliothèques
│   └── supabase.ts       # Client Supabase
│
├── types/                # Types TypeScript
│   ├── database.ts       # Types Supabase
│   └── index.ts          # Types métier
│
├── router/               # Vue Router
└── style.css             # Styles globaux
```

## 🚀 Installation & Lancement

```bash
# Installation des dépendances
npm install

# Configuration Supabase
# Créez un fichier .env à la racine avec :
# VITE_SUPABASE_URL=https://xxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...

# Lancement du serveur de développement
npm run dev

# Build pour production
npm run build
```

L'application sera accessible sur : `http://localhost:5173/`

## 📦 Configuration

### Supabase
Voir `SUPABASE-SETUP.md` pour la configuration complète de la base de données.

### Migration des données
Les scripts SQL sont dans `documentation/migrations/`. Voir `MIGRATION-README.md` pour les détails.

```bash
# Migration complète (clients, produits, ventes)
npm run migrate

# Migration à partir des ventes uniquement
npm run migrate:from-sales

# Simulation (sans exécuter)
npm run migrate:dry
```

## 🎯 Fonctionnalités à Venir

- [ ] Conformité NF525 complète
- [ ] Impression thermique
- [ ] Scanner code-barres
- [ ] Planning des rendez-vous
- [ ] Mode hors-ligne (PWA)

## 📝 License

© 2025 Extrémités Homme. Tous droits réservés.
