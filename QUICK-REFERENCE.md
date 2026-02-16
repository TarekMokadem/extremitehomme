# ⚡ QUICK REFERENCE - Aide-Mémoire Rapide

**Projet :** Caisse Extrémités Homme | **Budget :** 6 000€ | **Durée :** 6-7 mois

---

## 🎯 EN BREF

```
ÉTAT ACTUEL : ~80% (Application fonctionnelle avec Supabase)
PROCHAINE ÉTAPE : NF525, impression, scanner
```

---

## 📂 DOCUMENTS - QUEL FICHIER LIRE ?

| Besoin | Fichier | Pages | Temps |
|--------|---------|-------|-------|
| 🆕 **JE DÉMARRE** | START-HERE.md | 4 | 5 min |
| 💼 **Infos client/commercial** | PRESENTATION-CLIENT.md | 32 | 20 min |
| 🛠️ **Configuration Supabase** | SUPABASE-SETUP.md | - | 30 min |
| 📖 **Vue d'ensemble** | README-PROJET.md | 10 | 10 min |
| ✅ **Fonctionnalités existantes** | FONCTIONNALITES.md | 25 | 15 min |
| 📝 **Historique** | CHANGELOG.md | 12 | 10 min |
| 💻 **Doc technique code** | README.md | 10 | 15 min |
| 📚 **Chercher un doc** | INDEX.md | 6 | 5 min |

---

## 💰 BUDGET & PAIEMENTS

```
TOTAL : 6 000€

✅ Acompte        : 1 000€  (versé 29/01/2026)
⏳ Phase 1        :   800€  (Mars 2026)
⏳ Phase 2        :   850€  (Mai 2026)
⏳ Phase 3        :   850€  (Juillet 2026)
⏳ Année 2        : 2 500€  (2026-2027)
```

---

## 📅 PLANNING

```
✅ Phase 0 : Audit TERMINÉ
✅ Supabase + Caisse + Clients + Historique TERMINÉ
✅ Stock + Stats + Tiroir + Paramètres TERMINÉ
⏳ NF525 + Impression + Scanner À VENIR
```

---

## 🎯 ÉTAT DES MODULES

### ✅ Réalisé
- Supabase (PostgreSQL)
- Caisse (ventes persistées)
- Clients (historique, fidélité)
- Historique des ventes
- Stock
- Statistiques
- Tiroir de caisse
- Paramètres
- Commande
- Thème sombre
- American Express

### ⏳ À venir
- Conformité NF525 complète
- Impression thermique
- Scanner code-barres

---

## 🛠️ TECHNOLOGIES

### Frontend (Existant)
```
Vue 3.5.24
TypeScript 5.9.3
TailwindCSS v4
Vite 7.2.4
Lucide Icons
```

### Backend (À créer - Phase 1)
```
Node.js + Express
TypeScript
PostgreSQL 16
Prisma ORM
JWT Auth
Zod Validation
```

### Tests (À créer)
```
Vitest (unitaires)
Cypress (E2E)
```

---

## 📊 AVANCEMENT

```
████████░░░░░░░░░░░░░░░░░░░░ 30%

✅ Maquette frontend (30%)
❌ Backend (0%)
❌ BDD (0%)
❌ Modules avancés (0%)
❌ NF525 (0%)
```

**Détail :**
- Phase 0 : 100% ✅
- Phase 1 : 0%
- Phase 2 : 0%
- Phase 3 : 0%

---

## 📞 CONTACT RAPIDE

**Développeur :** [Votre nom]  
📧 [Votre email]  
📱 [Votre téléphone]

**Client :** Extrémités Homme  
📧 [Email client]  
📱 [Tél client]

---

## 🚀 COMMANDES RAPIDES

### Lancer Frontend Actuel
```bash
cd "C:\Users\Tarek Mokadem\Desktop\Projets\Caisse maquette"
npm install
npm run dev
# → http://localhost:5173
```

### Créer Backend (Phase 1)
```bash
mkdir backend && cd backend
npm init -y
npm install express @prisma/client cors helmet dotenv
npm install -D typescript @types/node @types/express prisma tsx
npx prisma init
# Voir NEXT-STEPS.md pour suite
```

### Lancer PostgreSQL (Docker)
```bash
docker run --name postgres-caisse \
  -e POSTGRES_USER=caisse_user \
  -e POSTGRES_PASSWORD=caisse_password \
  -e POSTGRES_DB=caisse_extremites \
  -p 5432:5432 \
  -d postgres:16
```

---

## 🔍 RECHERCHE RAPIDE

| Je cherche... | Fichier | Section |
|---------------|---------|---------|
| Code d'exemple backend | NEXT-STEPS.md | Section 2-3 |
| Schéma BDD Prisma | NEXT-STEPS.md | Section 1.5 |
| Architecture proposée | ROADMAP.md | Architecture globale |
| Liste fonctionnalités | FONCTIONNALITES.md | - |
| Calcul HT/TVA/TTC | NEXT-STEPS.md | Section 4.2 |
| Codes produits (1V, 2B) | AUDIT-TECHNIQUE.md | Types Manquants |
| API endpoints | NEXT-STEPS.md | Section 2.2 |
| Authentification JWT | NEXT-STEPS.md | Section 3 |
| Tests à faire | ROADMAP.md | Stratégie de tests |
| Infos commerciales | PRESENTATION-CLIENT.md | - |

---

## ✅ CHECKLIST PHASE 1

### Setup (Semaine 1)
- [ ] Créer dossier backend
- [ ] Installer PostgreSQL
- [ ] Configurer Prisma
- [ ] Créer schéma BDD
- [ ] Migration initiale
- [ ] Structure projet backend

### API (Semaine 2-3)
- [ ] Point d'entrée (index.ts)
- [ ] Routes principales
- [ ] Controllers (sales, clients, products)
- [ ] Auth JWT
- [ ] Middleware validation
- [ ] Gestion erreurs

### Frontend (Semaine 3-4)
- [ ] Client API (axios)
- [ ] Refactor useCart (HT/TVA/TTC)
- [ ] Affichage détaillé TVA
- [ ] Connexion au backend
- [ ] Enregistrement ventes
- [ ] Feedback utilisateur

### Tests (Semaine 5)
- [ ] Tests API (Postman)
- [ ] Tests calculs TVA
- [ ] Tests stock
- [ ] Scénario complet vente
- [ ] Tests manuels avec client

---

## 🎯 JALONS

| Date | Événement | Statut |
|------|-----------|--------|
| 02/12/2025 | Maquette créée | ✅ |
| 29/01/2026 | Vente 6000€ confirmée | ✅ |
| 29/01/2026 | Acompte 1000€ reçu | ✅ |
| 29/01/2026 | Phase 0 terminée | ✅ |
| Mars 2026 | Phase 1 livrée | ⏳ |
| Mai 2026 | Phase 2 livrée | ⏳ |
| Juil 2026 | Phase 3 livrée | ⏳ |
| Août 2026 | Production | ⏳ |

---

## 💡 AIDE-MÉMOIRE CODE

### Créer une API Route (Express)
```typescript
// src/routes/example.routes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);
router.post('/', createHandler);
router.get('/', listHandler);
router.get('/:id', getByIdHandler);

export default router;
```

### Créer un Controller
```typescript
// src/controllers/example.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createHandler = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const result = await prisma.model.create({ data });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

### Appeler API depuis Frontend
```typescript
// src/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Ajouter token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

### Calcul HT/TVA/TTC
```typescript
const TVA_RATE = 0.20; // 20%

const priceHT = 10.00;
const tva = priceHT * TVA_RATE;        // 2.00
const priceTTC = priceHT + tva;        // 12.00

// Ou inversement :
const priceTTC = 12.00;
const priceHT = priceTTC / (1 + TVA_RATE);  // 10.00
const tva = priceTTC - priceHT;             // 2.00
```

---

## 🐛 DÉPANNAGE RAPIDE

| Problème | Solution |
|----------|----------|
| `npm run dev` erreur | `npm install` puis réessayer |
| Port 5173 déjà utilisé | `npx kill-port 5173` |
| PostgreSQL connexion échoue | Vérifier que Docker/PostgreSQL tourne |
| Prisma erreur | `npx prisma generate` |
| Migration échoue | Vérifier DATABASE_URL dans .env |
| Frontend ne voit pas API | Vérifier CORS dans backend |
| JWT invalide | Vérifier JWT_SECRET dans .env |

---

## 📋 NOTES IMPORTANTES

### Décisions Techniques
- ✅ Backend séparé (API REST) pour flexibilité
- ✅ PostgreSQL pour NF525 compliance
- ✅ JWT pour auth (vs sessions)
- ✅ Prisma pour types auto + migrations

### Risques Identifiés
- ⚠️ Migration données anciennes (complexité inconnue)
- ⚠️ NF525 expertise requise (Phase 3)
- ⚠️ Budget serré (12.50€/h implicite)

### Points d'Attention
- 🎯 Prioriser impitoyablement
- 🎯 Valider avec client régulièrement
- 🎯 Tests dès Phase 1
- 🎯 Documentation à jour

---

## 🔗 LIENS UTILES

**Documentation :**
- [Vue 3](https://vuejs.org/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Prisma](https://www.prisma.io/docs)
- [Express](https://expressjs.com/)

**APIs :**
- [API Adresse FR](https://adresse.data.gouv.fr/api-doc/adresse)

**Standards :**
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [NF525](https://www.legifrance.gouv.fr/)

---

## ⚡ ACTIONS IMMÉDIATES

### Si Client :
1. ✅ Lire PRESENTATION-CLIENT.md
2. ✅ Valider roadmap
3. ✅ Confirmer hébergement
4. ✅ Donner accès ancienne app

### Si Développeur :
1. ✅ Lire AUDIT-TECHNIQUE.md
2. ✅ Lire ROADMAP.md
3. ✅ Lire NEXT-STEPS.md
4. ✅ Setup PostgreSQL
5. ✅ Créer backend
6. 🚀 Coder !

---

**Document créé le :** 29 janvier 2026  
**Dernière mise à jour :** 29 janvier 2026

**📌 Épingler ce fichier pour référence rapide !**
