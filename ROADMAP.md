# 🗺️ ROADMAP - Refonte Application de Caisse

**Client :** Extrémités Homme  
**Budget :** 6 000€  
**Date de début :** 29 janvier 2026  
**Statut :** En développement

---

## 📊 PHASE 0 : AUDIT TECHNIQUE (EN COURS)

### ✅ État de l'Existant

#### Frontend (Maquette fonctionnelle)
- ✅ Vue 3 + TypeScript + Vite + TailwindCSS v4
- ✅ Structure de base avec 3 colonnes responsive
- ✅ Composants principaux créés :
  - AppHeader (sélection vendeur)
  - ServiceGrid (grille de services + recherche)
  - TicketPanel (panier + paiement)
  - ClientPanel (formulaire client)
- ✅ Composables métier :
  - useCart (gestion panier)
  - useClient (gestion clients)
  - useVendor (gestion vendeurs)
  - useAddressAutocomplete (API adresse FR)
- ✅ Types TypeScript définis
- ✅ UI/UX moderne et responsive
- ✅ Réductions € et %
- ✅ Autocomplétion services et adresses

#### Backend
- ❌ **Inexistant** - à créer entièrement

#### Base de données
- ❌ **Inexistante** - données mockées actuellement
- ⚠️ Anciennes données à migrer depuis l'ancienne application

### 🎯 Fonctionnalités Manquantes (selon CDC)

#### Page de Caisse
- ❌ Calcul HT/TVA/TTC distinct
- ❌ Système de codes produits (ex: 1V)
- ❌ Gestion des variantes de produits
- ❌ Persistance des données
- ❌ Validation et enregistrement en BDD

#### Menu Principal
- ❌ Navigation complète inexistante
- ❌ Modules manquants :
  - Clients
  - Historique
  - Stock
  - Commandes
  - Inventaire
  - Statistiques
  - Prestations
  - Tiroir de caisse
  - Paramètres
  - Gmail
  - Déconnexion

#### Matériel
- ❌ Impression thermique USB
- ❌ Scanner code-barres
- ❌ Intégration matérielle

#### Conformité
- ❌ NF525 (journalisation, horodatage, certification)
- ❌ Journal d'audit
- ❌ Sécurité et traçabilité

---

## 🏗️ ARCHITECTURE PROPOSÉE

### Stack Technique

#### Frontend (Existant - à améliorer)
```
Vue 3.5.24
TypeScript 5.9.3
Vite 7.2.4
TailwindCSS v4
Lucide Icons
```

#### Backend (À créer)
```
Option 1: Node.js + Express + TypeScript
Option 2: Node.js + Fastify + TypeScript
Option 3: Bun + Hono (plus rapide)

Recommandation: Node.js + Express (plus stable et mature)
```

#### Base de Données (À créer)
```
Option 1: PostgreSQL (recommandé pour NF525)
Option 2: MySQL/MariaDB
Option 3: SQLite (plus simple mais limité)

Recommandation: PostgreSQL
- ACID compliant
- JSON support
- Excellent pour audit trail
- Extensions pour horodatage
```

#### ORM/Query Builder
```
Option 1: Prisma (type-safe, moderne)
Option 2: TypeORM (mature, complet)
Option 3: Drizzle (léger, performant)

Recommandation: Prisma
- Génération automatique types TS
- Migrations simples
- Excellent pour audit
```

### Structure du Projet

```
caisse-maquette/
├── frontend/               # Application Vue existante
│   ├── src/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── views/         # À créer (pages)
│   │   ├── router/        # À créer
│   │   ├── stores/        # À créer (Pinia)
│   │   ├── api/           # À créer (client API)
│   │   └── types/
│   └── package.json
│
├── backend/               # À créer
│   ├── src/
│   │   ├── routes/        # Routes API
│   │   ├── controllers/   # Logique métier
│   │   ├── services/      # Services métier
│   │   ├── models/        # Modèles Prisma
│   │   ├── middleware/    # Auth, validation
│   │   ├── utils/         # Utilitaires
│   │   └── types/         # Types partagés
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
│
├── shared/                # Types partagés front/back
│   └── types/
│
├── scripts/               # Scripts migration
│   └── migrate-old-data.ts
│
└── docs/                  # Documentation
    ├── API.md
    ├── DATABASE.md
    └── NF525.md
```

---

## 📅 PHASAGE DÉTAILLÉ

## 🚀 PHASE 1 : CAISSE FINALISÉE + BACKEND BASE
**Durée estimée :** 4-6 semaines  
**Livrable :** Page de caisse fonctionnelle avec backend

### 1.1 Setup Backend & BDD
- [ ] Initialiser projet backend (Express + TypeScript)
- [ ] Configurer PostgreSQL
- [ ] Setup Prisma ORM
- [ ] Créer schéma de base (users, products, services, sales)
- [ ] Migrations initiales
- [ ] Authentification JWT
- [ ] Middleware de sécurité

### 1.2 API Caisse
- [ ] POST /api/sales - Créer une vente
- [ ] GET /api/services - Liste des services
- [ ] POST /api/products - Ajouter produit au panier
- [ ] GET /api/vendors - Liste des vendeurs
- [ ] POST /api/payments - Enregistrer paiement
- [ ] GET /api/clients/search - Recherche client

### 1.3 Frontend - Amélioration Caisse
- [ ] Intégrer client API (axios/fetch)
- [ ] Calcul HT/TVA/TTC distinct
  - TVA paramétrable (20%, 10%, 5.5%)
  - Affichage détaillé sur ticket
- [ ] Système de codes produits (1V = 1 variante)
  - Parser codes (ex: 1V, 2B, 3S)
  - Gestion stock temps réel
- [ ] Gestion variantes
  - Couleurs, tailles, modèles
  - Prix différenciés
- [ ] Validation formulaire robuste
- [ ] Feedback utilisateur (toasts, alertes)
- [ ] Enregistrement en BDD
- [ ] Gestion erreurs réseau

### 1.4 Tests Phase 1
- [ ] Test ajout service au panier
- [ ] Test calcul TVA correct
- [ ] Test codes produits (1V, 2B, etc.)
- [ ] Test variantes
- [ ] Test enregistrement vente
- [ ] Test paiements multiples
- [ ] Test recherche client

---

## 📦 PHASE 2 : MODULES COMPLÉMENTAIRES
**Durée estimée :** 4-6 semaines  
**Livrable :** Gestion complète stock, clients, historique, commandes

### 2.1 Module CLIENTS
- [ ] Page liste clients (tableau + recherche)
- [ ] Fiche client détaillée
- [ ] Historique des achats client
- [ ] Statistiques client (CA, fréquence)
- [ ] Export clients (CSV, Excel)
- [ ] Import clients (depuis ancienne app)
- [ ] Fusion de doublons
- [ ] Segments clients (VIP, régulier, inactif)

### 2.2 Module STOCK
- [ ] Liste des produits avec stock actuel
- [ ] Alertes stock bas (seuils paramétrables)
- [ ] Mouvements de stock
  - Entrées (livraison)
  - Sorties (vente)
  - Ajustements (inventaire)
- [ ] Historique des mouvements
- [ ] Fournisseurs
- [ ] Commandes fournisseurs
- [ ] Valorisation stock

### 2.3 Module COMMANDES
- [ ] Créer commande fournisseur
- [ ] Suivi des commandes
- [ ] Réception de commande
- [ ] Mise à jour stock automatique
- [ ] Bon de commande PDF
- [ ] Historique des commandes

### 2.4 Module HISTORIQUE
- [ ] Liste de toutes les ventes
- [ ] Filtres avancés
  - Par date (plage)
  - Par vendeur
  - Par client
  - Par montant
  - Par moyen de paiement
- [ ] Détail d'une vente
- [ ] Réimpression ticket
- [ ] Avoir/remboursement
- [ ] Annulation vente (avec justification)
- [ ] Export période (CSV, Excel, PDF)

### 2.5 Module INVENTAIRE
- [ ] Lancer un inventaire
- [ ] Saisie par scanning
- [ ] Écarts inventaire vs stock théorique
- [ ] Ajustement automatique
- [ ] Rapport d'inventaire PDF
- [ ] Historique des inventaires

---

## 📊 PHASE 3 : AVANCÉ + NF525
**Durée estimée :** 4-6 semaines  
**Livrable :** Application complète certifiable NF525

### 3.1 Module FIDÉLITÉ
- [ ] Système de points
  - Configuration points par euro
  - Seuils de récompense
- [ ] Cartes de fidélité
- [ ] Promotions personnalisées
- [ ] Historique points client
- [ ] Notifications anniversaire
- [ ] Bons cadeaux

### 3.2 Module STATISTIQUES
- [ ] Dashboard principal
  - CA jour/semaine/mois/année
  - Évolution graphique
  - Top services/produits
  - Performance vendeurs
- [ ] Graphiques interactifs (Chart.js)
- [ ] Export rapports PDF
- [ ] Objectifs et prévisions
- [ ] Analyse ABC (Pareto)
- [ ] Analyse marges

### 3.3 Module TIROIR DE CAISSE
- [ ] Ouverture de caisse (fond de caisse)
- [ ] Mouvements caisse
  - Entrées/sorties
  - Justificatifs
- [ ] Fermeture de caisse
  - Comptage espèces
  - Écart théorique/réel
  - Rapport de caisse
- [ ] Historique des caisses
- [ ] Multi-caisses (si plusieurs)

### 3.4 Module PRESTATIONS (Services)
- [ ] Gestion des services
- [ ] Catégories personnalisées
- [ ] Durées et prix
- [ ] Actif/inactif
- [ ] Services composés (forfaits)
- [ ] Promotions temporaires

### 3.5 Module PARAMÈTRES
- [ ] Informations salon
  - Nom, adresse, SIRET
  - Logo
  - Coordonnées
- [ ] Configuration TVA
- [ ] Moyens de paiement actifs
- [ ] Imprimante (config)
- [ ] Sauvegarde/restauration BDD
- [ ] Utilisateurs et droits
- [ ] Thème/personnalisation

### 3.6 NF525 - CONFORMITÉ FISCALE
- [ ] Journal des événements immuable
  - Horodatage NTP
  - Hash chaîné (blockchain-like)
  - Signature cryptographique
- [ ] Archivage sécurisé
  - Conservation 6 ans
  - Export format normé
- [ ] Clôture journalière automatique
- [ ] Rapport Z quotidien
- [ ] Certificat d'authenticité
- [ ] Tests de non-altération
- [ ] Documentation conformité

### 3.7 Intégration GMAIL
- [ ] Envoi tickets par email
- [ ] Campagnes marketing
- [ ] Notifications automatiques
- [ ] Templates personnalisables

---

## 🖨️ MATÉRIEL - INTÉGRATION

### Imprimante Thermique USB
- [ ] Identification modèle client
- [ ] Driver/librairie (node-thermal-printer)
- [ ] Template ticket thermique
  - En-tête (logo, infos salon)
  - Lignes de vente
  - Totaux HT/TVA/TTC
  - Pied (mentions légales, NF525)
- [ ] Test impression
- [ ] Gestion erreurs (papier, connexion)

### Scanner Code-Barres
- [ ] Identification modèle
- [ ] Intégration HID (clavier)
- [ ] Ajout produit au panier par scan
- [ ] Inventaire par scan
- [ ] Recherche produit par code
- [ ] Gestion codes multiples (EAN13, Code128)

---

## 🔄 MIGRATION DES DONNÉES

### Analyse Anciennes Données
- [ ] Audit structure ancienne BDD
- [ ] Identification des données à migrer
  - Clients (nom, contact, historique)
  - Produits/Services
  - Ventes (si pertinent)
  - Stock
  - Paramètres
- [ ] Nettoyage données
  - Doublons
  - Incohérences
  - Format

### Scripts de Migration
- [ ] Script clients
- [ ] Script produits/services
- [ ] Script stock
- [ ] Script historique (optionnel)
- [ ] Validation post-migration
- [ ] Rapprochement comptable

### Tests Migration
- [ ] Test sur copie de BDD
- [ ] Vérification intégrité
- [ ] Validation métier avec client
- [ ] Migration production
- [ ] Sauvegarde sécurisée

---

## 🧪 STRATÉGIE DE TESTS

### Tests Unitaires
- [ ] Composables Vue
- [ ] Services backend
- [ ] Calculs métier (TVA, remises)
- [ ] Utilitaires

### Tests d'Intégration
- [ ] API endpoints
- [ ] Flux complets (vente de bout en bout)
- [ ] Gestion erreurs

### Tests E2E (End-to-End)
- [ ] Scénarios utilisateur complets
- [ ] Cypress ou Playwright
- [ ] Parcours critiques

### Tests Manuels
- [ ] UAT (User Acceptance Testing) avec client
- [ ] Tests matériel (imprimante, scanner)
- [ ] Tests performance
- [ ] Tests charge

---

## 📚 DOCUMENTATION

### Documentation Technique
- [ ] README.md général
- [ ] API.md (documentation API REST)
- [ ] DATABASE.md (schéma BDD)
- [ ] ARCHITECTURE.md
- [ ] DEPLOYMENT.md (déploiement)
- [ ] NF525.md (conformité)

### Documentation Utilisateur
- [ ] Guide d'utilisation (PDF illustré)
- [ ] Vidéos tutoriels
- [ ] FAQ
- [ ] Guide de dépannage

### Documentation Maintenance
- [ ] Procédures de sauvegarde
- [ ] Procédures de restauration
- [ ] Mise à jour logiciel
- [ ] Résolution problèmes courants

---

## 🚀 DÉPLOIEMENT

### Environnements
- [ ] **DEV** : Développement local
- [ ] **STAGING** : Pré-production (tests client)
- [ ] **PRODUCTION** : Client final

### Hébergement Options

#### Option 1 : Serveur Local (Recommandé)
- Mini-PC dans le salon
- Accès réseau local uniquement
- Sécurité maximale
- Pas de dépendance internet
- Coût : ~300-500€ (one-time)

#### Option 2 : VPS Cloud
- OVH, Scaleway, Contabo
- Accès distant
- Sauvegardes automatiques
- Coût : ~10-30€/mois

#### Option 3 : Hébergement Dédié
- Plus cher mais plus puissant
- Coût : ~50-100€/mois

**Recommandation Client :** Serveur local + sauvegardes cloud

### Processus de Déploiement
- [ ] Configuration serveur
- [ ] Installation PostgreSQL
- [ ] Installation Node.js
- [ ] Déploiement backend
- [ ] Déploiement frontend (build static)
- [ ] Configuration reverse proxy (Nginx)
- [ ] SSL/HTTPS (Let's Encrypt)
- [ ] Monitoring (Uptime, logs)
- [ ] Sauvegardes automatiques (BDD + files)

---

## 🎯 JALONS & LIVRABLES

### Jalon 1 : Backend + Caisse Fonctionnelle
- ✅ Backend API opérationnel
- ✅ BDD PostgreSQL + Prisma
- ✅ Page caisse avec calculs HT/TVA/TTC
- ✅ Enregistrement ventes en BDD
- ✅ Authentification
- 📦 **Livrable :** Application caisse utilisable

### Jalon 2 : Modules Gestion
- ✅ Module Clients complet
- ✅ Module Stock complet
- ✅ Module Historique complet
- ✅ Module Commandes complet
- ✅ Module Inventaire complet
- 📦 **Livrable :** Gestion complète du salon

### Jalon 3 : Modules Avancés + NF525
- ✅ Fidélité
- ✅ Statistiques avec graphiques
- ✅ Tiroir de caisse
- ✅ Paramètres
- ✅ NF525 certifiable
- ✅ Impression thermique
- ✅ Scanner intégré
- 📦 **Livrable :** Application complète et conforme

### Jalon 4 : Migration + Formation
- ✅ Migration données anciennes
- ✅ Tests complets
- ✅ Documentation finale
- ✅ Formation utilisateurs
- ✅ Mise en production
- 📦 **Livrable :** Salon opérationnel avec nouvelle caisse

---

## 💰 BUDGET & PAIEMENTS

**Total :** 6 000€

**Calendrier de paiement :**
- ✅ Acompte : 1 000€ (versé)
- 📅 Année 1 : 2 500€ (échéancier à définir)
- 📅 Année 2 : 2 500€ (échéancier à définir)

**Proposition échéancier Année 1 :**
- À la livraison Jalon 1 : 800€
- À la livraison Jalon 2 : 850€
- À la livraison Jalon 3 : 850€

**Proposition échéancier Année 2 :**
- Tous les 3 mois : 625€ (×4)
- OU Tous les 6 mois : 1 250€ (×2)

---

## ⚠️ RISQUES & MITIGATION

### Risques Techniques
| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Incompatibilité imprimante | Élevé | Moyen | Tests précoces, alternatives |
| Performance BDD | Moyen | Faible | Indexation, optimisation requêtes |
| Migration données échoue | Élevé | Moyen | Tests sur copies, validation client |
| Conformité NF525 complexe | Élevé | Moyen | Recherche approfondie, expert si besoin |

### Risques Projet
| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Dérive périmètre (scope creep) | Élevé | Élevé | CDC signé, validation changements |
| Indisponibilité client pour tests | Moyen | Moyen | Planning défini en amont |
| Retard planning | Moyen | Moyen | Livraisons incrémentales, priorisation |

---

## 📞 SUPPORT & MAINTENANCE

### Support Inclus (1ère année)
- Corrections de bugs
- Assistance technique (email + téléphone)
- Mises à jour mineures

### Support Post-Garantie
- Forfait maintenance : à définir
- Interventions ponctuelles : à définir

### Évolutions Futures
- Nouvelles fonctionnalités sur devis
- Application mobile : devis séparé
- Multi-établissements : devis séparé

---

## 📊 MÉTRIQUES DE SUCCÈS

### Technique
- [ ] 100% des ventes enregistrées en BDD
- [ ] Temps de réponse API < 200ms (moyenne)
- [ ] 0 perte de données
- [ ] Uptime > 99.5%
- [ ] Conformité NF525 validée

### Métier
- [ ] Temps de vente réduit de 30%
- [ ] 0 erreur de caisse
- [ ] Satisfaction client > 4/5
- [ ] Formation équipe < 2h
- [ ] Adoption complète en 1 semaine

---

## ✅ CHECKLIST FINALE

### Avant Mise en Production
- [ ] Tous les tests passent (unitaires, intégration, E2E)
- [ ] Documentation complète
- [ ] Formation utilisateurs effectuée
- [ ] Migration données validée
- [ ] Sauvegardes configurées
- [ ] Monitoring en place
- [ ] Matériel testé (imprimante, scanner)
- [ ] NF525 validé
- [ ] Plan de rollback préparé
- [ ] Support technique prêt

### Post-Déploiement (J+7)
- [ ] Vérification utilisation quotidienne
- [ ] Feedback équipe collecté
- [ ] Ajustements mineurs effectués
- [ ] Performance monitorée
- [ ] Sauvegardes vérifiées

### Post-Déploiement (J+30)
- [ ] Bilan avec client
- [ ] Statistiques d'usage analysées
- [ ] Formations complémentaires si besoin
- [ ] Plan d'évolution défini

---

**Document créé le :** 29 janvier 2026  
**Dernière mise à jour :** 29 janvier 2026  
**Version :** 1.0  
**Statut :** Phase 0 en cours

**Prochaine étape :** Validation roadmap avec client, puis démarrage Phase 1.
