# 💼 Extrémités Homme - Système de Caisse

Application de caisse moderne pour salon de coiffure et barbier, développée avec Vue 3, TypeScript et TailwindCSS.

## ✨ Fonctionnalités

### 👤 Gestion des Vendeurs
- **Sélection du vendeur** : Menu déroulant dans le header pour changer facilement de vendeur
- 4 vendeurs pré-configurés avec avatars colorés
- Affichage du vendeur actif en temps réel

### 🛒 Gestion du Panier
- Ajout/suppression de services
- Modification des quantités (+/-)
- Badge visuel indiquant la quantité sur chaque service
- Calcul automatique du sous-total et total
- Validation de transaction

### 💰 Réductions Flexibles
- **Mode € (euros)** : Réduction en montant fixe
- **Mode % (pourcentage)** : Réduction en pourcentage du total
- Toggle intuitif pour basculer entre les deux modes
- Calcul automatique du montant final

### 💳 Moyens de Paiement
- Espèces
- Carte bancaire (CB)
- Sans contact
- Chèque
- Carte cadeau

### 🔍 Recherche Avancée

#### Services
- **Recherche en temps réel** : Filtrage instantané
- **Autocomplétion** : Suggestions de services dès 2 caractères
- Menu déroulant avec prix et durée
- Affichage limité à 8 résultats pertinents

#### Clients
- **Recherche par nom, prénom ou téléphone**
- Suggestions avec informations de contact
- Sélection rapide pour remplir le formulaire

### 👥 Gestion des Clients

#### Formulaire Complet
- Nom et prénom
- 2 numéros de téléphone
- Email
- Adresse complète
- Date d'anniversaire
- Notes et commentaires

#### Autocomplétion d'Adresses (API Gouvernement FR)
- **Sans Google Maps !** Utilise l'API gratuite du gouvernement français
- **Adresses** : Suggestions en temps réel dès 3 caractères
- **Villes** : Autocomplétion avec codes postaux
- Remplissage automatique de l'adresse, ville et CP
- API officielle : `api-adresse.data.gouv.fr`

#### Actions Client
- Historique des visites (à implémenter)
- Effacer le formulaire
- Enregistrer les informations

### 📊 Interface

#### Disposition 3 Colonnes
```
┌─────────────┬──────────────────┬─────────────┐
│   TICKET    │     SERVICES     │   CLIENT    │
│             │                  │             │
│  Date       │  Recherche       │  Recherche  │
│  Articles   │  Catégories      │  Formulaire │
│  +/-        │  Grille          │  Adresse    │
│  Réduction  │  (responsive)    │  Notes      │
│  Paiement   │                  │  Actions    │
│  Total      │                  │             │
│  Actions    │                  │             │
└─────────────┴──────────────────┴─────────────┘
```

#### Catégories de Services
- Tous
- Coupes (bordure bleue)
- Barbe (bordure ambre)
- Soins (bordure émeraude)
- Épilation (bordure rose)
- Massage (bordure violette)
- Autres (bordure grise)

## 🎨 Design

### Principes UX
- **Design épuré** : Thème clair, couleurs sobres
- **Icônes professionnelles** : Lucide Icons (SVG)
- **Typographie Inter** : Police moderne et lisible
- **Espacements généreux** : Padding et margins optimisés
- **Zones tactiles** : 44x44px minimum (standard mobile)

### Accessibilité (WCAG 2.1)
- Contraste texte AAA
- Focus visible sur tous les éléments
- Labels ARIA sur les boutons
- Navigation au clavier
- États hover/active/disabled

### Animations
- Transitions fluides (200ms)
- Feedbacks visuels immédiats
- Pulse sur les badges de quantité
- Hover avec élévation des cartes
- Transitions CSS optimisées GPU

## 🏗️ Architecture Technique

### Stack
- **Vue 3** - Framework progressif
- **TypeScript** - Typage fort
- **TailwindCSS v4** - Styling utility-first
- **Vite** - Build tool rapide
- **Lucide Vue** - Icônes SVG

### Structure SOLID

```
src/
├── components/              # Single Responsibility
│   ├── AppHeader.vue       # En-tête avec vendeur
│   ├── TicketPanel.vue     # Ticket et paiement
│   ├── ServiceGrid.vue     # Grille des services
│   ├── ServiceCard.vue     # Carte de service
│   └── ClientPanel.vue     # Formulaire client
│
├── composables/            # Dependency Inversion
│   ├── useCart.ts          # Logique panier
│   ├── useClient.ts        # Logique client
│   ├── useVendor.ts        # Logique vendeur
│   └── useAddressAutocomplete.ts  # API adresses
│
├── types/                  # Interface Segregation
│   └── index.ts            # Types TypeScript
│
├── data/
│   └── services.ts         # Données des services
│
└── style.css               # Styles globaux
```

### Principes SOLID Appliqués

1. **Single Responsibility** : Chaque composant a une seule responsabilité
2. **Open/Closed** : Composants extensibles via props et slots
3. **Liskov Substitution** : Types cohérents et interchangeables
4. **Interface Segregation** : Composables séparés par domaine
5. **Dependency Inversion** : Injection via composables

## 🚀 Installation & Lancement

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement
npm run dev

# Build pour production
npm run build
```

L'application sera accessible sur : `http://localhost:5173/`

## 📦 Dépendances

```json
{
  "dependencies": {
    "vue": "^3.5.24",
    "lucide-vue-next": "latest"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "latest",
    "tailwindcss": "latest",
    "typescript": "~5.9.3",
    "vite": "^7.2.4",
    "@vitejs/plugin-vue": "^6.0.1"
  }
}
```

## 🎯 Fonctionnalités à Venir

- [ ] Base de données clients persistante
- [ ] Historique des transactions
- [ ] Statistiques et rapports
- [ ] Planning des rendez-vous
- [ ] Impression de tickets
- [ ] Export comptable
- [ ] Multi-devises
- [ ] Mode hors-ligne (PWA)

## 🔧 Configuration

### API Adresse Gouvernement
L'autocomplétion utilise l'API publique gratuite :
- **URL** : `https://api-adresse.data.gouv.fr`
- **Documentation** : https://adresse.data.gouv.fr/api-doc/adresse
- **Aucune clé API requise**
- **Données officielles** de la Base Adresse Nationale

### Services
Les services sont configurables dans `src/data/services.ts` :
- Prix
- Durée
- Catégorie
- Nom et description

## 📝 License

© 2025 Extrémités Homme. Tous droits réservés.
