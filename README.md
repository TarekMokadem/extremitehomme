# 💼 Extrémités Homme - Système de Caisse

Application de caisse complète pour salon de coiffure et barbier (chausseur, coiffeur, barbier), développée avec Vue 3, TypeScript, TailwindCSS v4 et Supabase.

**Statut :** ✅ Application terminée et opérationnelle

---

## ✨ Fonctionnalités

### 🔐 Authentification
- Connexion par email/mot de passe (Supabase Auth)
- Protection des routes
- Déconnexion

### 🏪 Page Caisse
- **Sélection du vendeur** : Menu déroulant dans le header
- **Services et produits** : Grille chargée depuis Supabase, recherche et filtres par catégorie
- **Scanner code-barres** : Champ dédié pour ajouter des produits par scan
- **Panier** : Ajout/suppression, modification des quantités, calcul HT/TVA/TTC
- **Réductions** : Mode € (euros) ou % (pourcentage)
- **Paiements** : Espèces, CB, Sans contact, American Express, Chèque, Carte cadeau
- **Validation** : Enregistrement des ventes en base de données
- **Impression thermique** : Ticket 80mm (ESC/POS)

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
- Gestion des produits et variantes (tailles)
- Codes-barres et étiquettes imprimables
- Alertes de stock
- Mouvements d'inventaire

### 💵 Page Tiroir de Caisse
- Ouverture/fermeture de caisse
- Mouvements (entrées/sorties)
- Rapprochement espèces

### 📄 Page Fin de Journée
- Clôture journalière
- Journal des ventes
- Archivage NF525 (chaînage hash SHA-256)

### 📊 Pages Statistiques
- **Statistiques générales** : Graphiques et indicateurs
- **Stats par employé** : Performance par vendeur
- **Chiffre d'affaires** : CA détaillé
- **Récap mensuel** : Synthèse mensuelle
- **Valeur théorique** : Valeur du stock

### ⚙️ Page Paramètres
- Configuration de l'application
- En-tête et pied de page des tickets

### 🎨 Interface
- **Thème sombre** : Bascule clair/sombre
- **Responsive** : Adapté mobile et desktop (onglets sur mobile)
- **Navigation** : 13 routes

### 🔍 Recherche & Autocomplétion
- **Services** : Recherche en temps réel, suggestions dès 2 caractères
- **Clients** : Par nom, prénom, téléphone
- **Adresses** : API gouvernementale française (api-adresse.data.gouv.fr) - gratuite, sans clé

---

## 🏗️ Architecture Technique

### Stack
- **Vue 3** - Framework progressif
- **TypeScript** - Typage fort
- **TailwindCSS v4** - Styling utility-first
- **Vite** - Build tool
- **Supabase** - Backend as a Service (PostgreSQL, Auth)
- **Lucide Vue** - Icônes SVG

### Structure du projet

```
src/
├── components/           # Composants réutilisables
│   ├── AppHeader.vue     # En-tête + vendeur + navigation
│   ├── TicketPanel.vue   # Panier + paiement + impression
│   ├── ServiceGrid.vue   # Grille services + scan code-barres
│   ├── ServiceCard.vue   # Carte de service
│   ├── ClientPanel.vue   # Formulaire client
│   ├── CartPanel.vue     # Panier (mode alternatif)
│   ├── LoyaltyCard.vue   # Carte fidélité
│   └── ProductPickerDialog.vue # Sélection produits physiques
│
├── pages/                # Pages de l'application
│   ├── LoginPage.vue     # Connexion
│   ├── CaissePage.vue    # Page principale caisse
│   ├── ClientsPage.vue   # Gestion clients
│   ├── HistoriquePage.vue # Historique des ventes
│   ├── StockPage.vue     # Gestion stock
│   ├── ValeurTheoriquePage.vue # Valeur théorique du stock
│   ├── TiroirCaissePage.vue
│   ├── FinDeJourneePage.vue
│   ├── StatistiquesPage.vue
│   ├── StatsEmployePage.vue
│   ├── ChiffreAffairePage.vue
│   ├── RecapMensuelPage.vue
│   └── ParametresPage.vue
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
│   ├── useSettings.ts    # Paramètres
│   ├── useFinDeJournee.ts
│   ├── useArchiveNF525.ts # Archivage NF525
│   ├── useBarcodeScanner.ts
│   └── useAddressAutocomplete.ts
│
├── lib/                  # Bibliothèques
│   ├── supabase.ts       # Client Supabase
│   ├── thermalPrint.ts   # Impression thermique 80mm
│   ├── printBarcodeLabels.ts # Étiquettes code-barres
│   └── nf525.ts         # Utilitaires NF525 (hash SHA-256)
│
├── types/                # Types TypeScript
│   ├── database.ts       # Types Supabase
│   └── index.ts          # Types métier
│
├── router/               # Vue Router
└── style.css             # Styles globaux
```

---

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

## 🎯 Fonctionnalités à Venir (optionnelles)

- [ ] Planning des rendez-vous
- [ ] Mode hors-ligne (PWA)

## 📝 License

© 2025 Extrémités Homme. Tous droits réservés.
