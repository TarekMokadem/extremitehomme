# 🎯 PROCHAINES ÉTAPES - Phase 1

**Date :** 29 janvier 2026  
**Objectif :** Démarrer le développement du backend et finaliser la page de caisse

---

## 📋 CE QUI A ÉTÉ FAIT (Phase 0)

✅ **Audit technique complet** → Voir `AUDIT-TECHNIQUE.md`  
✅ **Roadmap détaillée** → Voir `ROADMAP.md`  
✅ **Analyse de l'existant**  
✅ **Définition de l'architecture**  
✅ **Estimation du budget et du temps**

**Résultat :** Nous avons une vision claire de ce qui doit être fait et comment le faire.

---

## 🚀 PHASE 1 : BACKEND + CAISSE FINALISÉE

### Objectifs Phase 1
1. Créer le backend avec API REST sécurisée
2. Mettre en place PostgreSQL avec Prisma
3. Finaliser les calculs HT/TVA/TTC
4. Implémenter le système de codes produits (1V, 2B, etc.)
5. Rendre la page de caisse 100% fonctionnelle avec persistance

**Durée estimée :** 4-6 semaines  
**Livrable :** Page de caisse utilisable en production

---

## 📝 TÂCHES DÉTAILLÉES

### 1️⃣ Setup Backend (Semaine 1-2)

#### 1.1 Initialisation Projet Backend
```bash
# Créer dossier backend
mkdir backend
cd backend

# Initialiser npm
npm init -y

# Installer dépendances principales
npm install express cors helmet express-rate-limit
npm install jsonwebtoken bcryptjs
npm install dotenv
npm install @prisma/client
npm install zod

# Installer dépendances de dev
npm install -D typescript @types/node @types/express
npm install -D @types/jsonwebtoken @types/bcryptjs
npm install -D tsx nodemon
npm install -D prisma
```

**Durée :** 1-2 heures

---

#### 1.2 Configuration TypeScript
Créer `backend/tsconfig.json` :
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Durée :** 30 minutes

---

#### 1.3 Structure du Projet Backend
```bash
backend/
├── src/
│   ├── index.ts              # Point d'entrée
│   ├── config/
│   │   └── database.ts       # Config Prisma
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── sales.routes.ts
│   │   ├── clients.routes.ts
│   │   ├── products.routes.ts
│   │   └── vendors.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── sales.controller.ts
│   │   ├── clients.controller.ts
│   │   └── products.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── sales.service.ts
│   │   └── stock.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   ├── utils/
│   │   ├── jwt.util.ts
│   │   └── hash.util.ts
│   └── types/
│       └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

**Durée :** 1 heure (créer structure + fichiers vides)

---

#### 1.4 Installation PostgreSQL

**Option 1 : Installation Locale (Windows)**
```bash
# Télécharger PostgreSQL 16 depuis postgresql.org
# Installer avec pgAdmin 4
# Créer base de données : caisse_extremites
```

**Option 2 : Docker (Plus simple)**
```bash
# Créer docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: caisse_user
      POSTGRES_PASSWORD: caisse_password
      POSTGRES_DB: caisse_extremites
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Lancer PostgreSQL
docker-compose up -d
```

**Durée :** 1-2 heures

---

#### 1.5 Configuration Prisma

Créer `backend/prisma/schema.prisma` :
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// --- UTILISATEURS (Vendeurs/Admins) ---
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // Hash bcrypt
  firstName String
  lastName  String
  role      UserRole @default(VENDOR)
  color     String   @default("#3B82F6") // Couleur avatar
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  sales     Sale[]
  stockMovements StockMovement[]

  @@map("users")
}

enum UserRole {
  ADMIN
  MANAGER
  VENDOR
}

// --- CLIENTS ---
model Client {
  id         String    @id @default(cuid())
  firstName  String
  lastName   String
  phone      String
  phone2     String?
  email      String?
  address    String?
  city       String?
  postalCode String?
  birthDate  DateTime?
  notes      String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  // Relations
  sales        Sale[]
  loyaltyPoints LoyaltyPoint[]

  @@map("clients")
}

// --- PRODUITS/SERVICES ---
model Product {
  id             String      @id @default(cuid())
  code           String      @unique // "1V", "2B", etc.
  name           String
  description    String?
  type           ProductType
  category       String
  priceHT        Float       // Prix HT
  tvaRate        Float       @default(0.20) // 20%
  duration       Int?        // Durée en minutes (pour services)
  stock          Int         @default(0)
  alertThreshold Int         @default(5)
  isActive       Boolean     @default(true)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  // Relations
  variants       ProductVariant[]
  saleItems      SaleItem[]
  stockMovements StockMovement[]

  @@map("products")
}

enum ProductType {
  SERVICE
  PRODUCT
}

// --- VARIANTES DE PRODUITS ---
model ProductVariant {
  id            String   @id @default(cuid())
  productId     String
  name          String   // "Rouge", "Taille M"
  code          String   @unique // Code-barres EAN13
  priceModifier Float    @default(0) // +/- sur prix de base
  stock         Int      @default(0)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  product   Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  saleItems SaleItem[]

  @@map("product_variants")
}

// --- VENTES ---
model Sale {
  id             String       @id @default(cuid())
  ticketNumber   String       @unique // "T-20260129-0001"
  vendorId       String
  clientId       String?
  subtotalHT     Float
  totalTVA       Float
  subtotalTTC    Float
  discountType   DiscountType
  discountValue  Float        @default(0)
  discountAmount Float        @default(0)
  total          Float
  status         SaleStatus   @default(COMPLETED)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  // Relations
  vendor   User         @relation(fields: [vendorId], references: [id])
  client   Client?      @relation(fields: [clientId], references: [id])
  items    SaleItem[]
  payments Payment[]

  @@map("sales")
}

enum DiscountType {
  EURO
  PERCENT
}

enum SaleStatus {
  PENDING
  COMPLETED
  CANCELLED
  REFUNDED
}

// --- LIGNES DE VENTE ---
model SaleItem {
  id           String  @id @default(cuid())
  saleId       String
  productId    String
  variantId    String?
  name         String  // Nom au moment de la vente
  priceHT      Float
  tvaRate      Float
  quantity     Int
  subtotalHT   Float
  tva          Float
  subtotalTTC  Float
  createdAt    DateTime @default(now())

  // Relations
  sale    Sale            @relation(fields: [saleId], references: [id], onDelete: Cascade)
  product Product         @relation(fields: [productId], references: [id])
  variant ProductVariant? @relation(fields: [variantId], references: [id])

  @@map("sale_items")
}

// --- PAIEMENTS ---
model Payment {
  id            String        @id @default(cuid())
  saleId        String
  method        PaymentMethod
  amount        Float
  createdAt     DateTime      @default(now())

  // Relations
  sale Sale @relation(fields: [saleId], references: [id], onDelete: Cascade)

  @@map("payments")
}

enum PaymentMethod {
  CASH
  CARD
  CONTACTLESS
  CHECK
  GIFT_CARD
}

// --- MOUVEMENTS DE STOCK ---
model StockMovement {
  id          String            @id @default(cuid())
  productId   String
  variantId   String?
  type        StockMovementType
  quantity    Int
  reason      String
  referenceId String?           // ID vente ou commande
  userId      String
  createdAt   DateTime          @default(now())

  // Relations
  product Product @relation(fields: [productId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@map("stock_movements")
}

enum StockMovementType {
  IN
  OUT
  ADJUSTMENT
}

// --- FIDÉLITÉ ---
model LoyaltyPoint {
  id        String   @id @default(cuid())
  clientId  String
  points    Int
  reason    String
  createdAt DateTime @default(now())

  // Relations
  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@map("loyalty_points")
}

// --- JOURNAL D'AUDIT (NF525) ---
model AuditLog {
  id           String   @id @default(cuid())
  timestamp    DateTime @default(now())
  eventType    String
  data         Json
  hash         String
  previousHash String
  signature    String
  createdAt    DateTime @default(now())

  @@map("audit_logs")
}
```

**Durée :** 2-3 heures

---

#### 1.6 Migrations Initiales
```bash
cd backend

# Initialiser Prisma
npx prisma init

# Configurer .env
echo "DATABASE_URL=postgresql://caisse_user:caisse_password@localhost:5432/caisse_extremites" > .env

# Créer migration
npx prisma migrate dev --name init

# Générer client Prisma
npx prisma generate
```

**Durée :** 1 heure

---

### 2️⃣ API Backend (Semaine 2-3)

#### 2.1 Point d'Entrée (`src/index.ts`)
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/auth.routes';
import salesRoutes from './routes/sales.routes';
import clientsRoutes from './routes/clients.routes';
import productsRoutes from './routes/products.routes';
import vendorsRoutes from './routes/vendors.routes';

// Middleware
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware globaux
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // max 100 requêtes
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/vendors', vendorsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handler (doit être en dernier)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
```

**Durée :** 1-2 heures

---

#### 2.2 Routes Principales

**Créer `src/routes/sales.routes.ts` :**
```typescript
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { 
  createSale, 
  getSales, 
  getSaleById 
} from '../controllers/sales.controller';

const router = Router();

// Toutes les routes nécessitent authentification
router.use(authenticateToken);

// POST /api/sales - Créer une vente
router.post('/', createSale);

// GET /api/sales - Liste des ventes (avec filtres)
router.get('/', getSales);

// GET /api/sales/:id - Détail d'une vente
router.get('/:id', getSaleById);

export default router;
```

**Créer les autres routes de manière similaire.**

**Durée :** 3-4 heures pour toutes les routes

---

#### 2.3 Controllers

**Créer `src/controllers/sales.controller.ts` :**
```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schéma de validation Zod
const createSaleSchema = z.object({
  clientId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive()
  })),
  discountType: z.enum(['EURO', 'PERCENT']),
  discountValue: z.number().min(0),
  payments: z.array(z.object({
    method: z.enum(['CASH', 'CARD', 'CONTACTLESS', 'CHECK', 'GIFT_CARD']),
    amount: z.number().positive()
  }))
});

export const createSale = async (req: Request, res: Response) => {
  try {
    // Validation
    const data = createSaleSchema.parse(req.body);
    const vendorId = req.user.id; // Depuis JWT

    // 1. Récupérer produits
    const products = await prisma.product.findMany({
      where: {
        id: { in: data.items.map(i => i.productId) }
      }
    });

    // 2. Calculer totaux
    let subtotalHT = 0;
    let totalTVA = 0;
    const saleItems = [];

    for (const item of data.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      const priceHT = product.priceHT;
      const tvaRate = product.tvaRate;
      const itemSubtotalHT = priceHT * item.quantity;
      const itemTVA = itemSubtotalHT * tvaRate;

      subtotalHT += itemSubtotalHT;
      totalTVA += itemTVA;

      saleItems.push({
        productId: product.id,
        variantId: item.variantId,
        name: product.name,
        priceHT,
        tvaRate,
        quantity: item.quantity,
        subtotalHT: itemSubtotalHT,
        tva: itemTVA,
        subtotalTTC: itemSubtotalHT + itemTVA
      });
    }

    const subtotalTTC = subtotalHT + totalTVA;

    // 3. Calculer réduction
    let discountAmount = 0;
    if (data.discountType === 'EURO') {
      discountAmount = Math.min(data.discountValue, subtotalTTC);
    } else {
      discountAmount = (subtotalTTC * data.discountValue) / 100;
    }

    const total = subtotalTTC - discountAmount;

    // 4. Générer numéro de ticket
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const lastTicket = await prisma.sale.findFirst({
      where: { ticketNumber: { startsWith: `T-${today}` } },
      orderBy: { ticketNumber: 'desc' }
    });
    
    let ticketNumber = `T-${today}-0001`;
    if (lastTicket) {
      const lastNum = parseInt(lastTicket.ticketNumber.split('-')[2]);
      ticketNumber = `T-${today}-${(lastNum + 1).toString().padStart(4, '0')}`;
    }

    // 5. Créer vente en transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Créer vente
      const newSale = await tx.sale.create({
        data: {
          ticketNumber,
          vendorId,
          clientId: data.clientId,
          subtotalHT,
          totalTVA,
          subtotalTTC,
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountAmount,
          total,
          status: 'COMPLETED',
          items: {
            create: saleItems
          },
          payments: {
            create: data.payments
          }
        },
        include: {
          items: true,
          payments: true,
          vendor: true,
          client: true
        }
      });

      // Décrémenter stock
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });

        // Créer mouvement de stock
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            type: 'OUT',
            quantity: -item.quantity,
            reason: 'Vente',
            referenceId: newSale.id,
            userId: vendorId
          }
        });
      }

      return newSale;
    });

    res.status(201).json(sale);
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(400).json({ error: error.message });
  }
};

export const getSales = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, vendorId, clientId, limit = 50 } = req.query;

    const sales = await prisma.sale.findMany({
      where: {
        ...(startDate && { createdAt: { gte: new Date(startDate as string) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate as string) } }),
        ...(vendorId && { vendorId: vendorId as string }),
        ...(clientId && { clientId: clientId as string })
      },
      include: {
        vendor: true,
        client: true,
        items: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string)
    });

    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSaleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        vendor: true,
        client: true,
        items: {
          include: {
            product: true,
            variant: true
          }
        },
        payments: true
      }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

**Durée :** 2-3 jours pour tous les controllers

---

### 3️⃣ Authentification JWT (Semaine 2)

**Créer `src/middleware/auth.middleware.ts` :**
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
```

**Créer `src/controllers/auth.controller.ts` :**
```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Trouver utilisateur
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Vérifier mot de passe
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Générer token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

**Durée :** 1 jour

---

### 4️⃣ Frontend - Intégration API (Semaine 3-4)

#### 4.1 Créer Client API (`src/api/client.ts`)
```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter token JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

---

#### 4.2 Refactoriser `useCart.ts` avec Calculs HT/TVA/TTC
```typescript
import { ref, computed } from 'vue';
import type { CartItem, Service } from '../types';

const TVA_RATES = {
  NORMAL: 0.20,    // 20%
  REDUCED: 0.10,   // 10%
  SUPER_REDUCED: 0.055 // 5.5%
};

export function useCart() {
  const items = ref<CartItem[]>([]);
  const discountType = ref<'euro' | 'percent'>('euro');
  const discountValue = ref(0);

  // Sous-total HT (sans TVA)
  const subtotalHT = computed(() => {
    return items.value.reduce((sum, item) => {
      // Supposons que le prix soit HT (à adapter selon vos données)
      const priceHT = item.service.price / (1 + TVA_RATES.NORMAL);
      return sum + (priceHT * item.quantity);
    }, 0);
  });

  // Total TVA
  const totalTVA = computed(() => {
    return items.value.reduce((sum, item) => {
      const priceHT = item.service.price / (1 + TVA_RATES.NORMAL);
      const tva = priceHT * TVA_RATES.NORMAL * item.quantity;
      return sum + tva;
    }, 0);
  });

  // Sous-total TTC (HT + TVA)
  const subtotalTTC = computed(() => subtotalHT.value + totalTVA.value);

  // Montant de la réduction
  const discountAmount = computed(() => {
    if (discountValue.value === 0) return 0;
    
    if (discountType.value === 'euro') {
      return Math.min(discountValue.value, subtotalTTC.value);
    } else {
      return (subtotalTTC.value * discountValue.value) / 100;
    }
  });

  // Total final (TTC - réduction)
  const total = computed(() => Math.max(0, subtotalTTC.value - discountAmount.value));

  const addItem = (service: Service) => {
    const existing = items.value.find(item => item.service.id === service.id);
    if (existing) {
      existing.quantity++;
    } else {
      items.value.push({ service, quantity: 1 });
    }
  };

  const removeItem = (serviceId: number) => {
    items.value = items.value.filter(item => item.service.id !== serviceId);
  };

  const updateQuantity = (serviceId: number, quantity: number) => {
    const item = items.value.find(item => item.service.id === serviceId);
    if (item) {
      item.quantity = Math.max(0, quantity);
    }
  };

  const clearCart = () => {
    items.value = [];
    discountValue.value = 0;
  };

  return {
    items,
    discountType,
    discountValue,
    subtotalHT,
    totalTVA,
    subtotalTTC,
    discountAmount,
    total,
    addItem,
    removeItem,
    updateQuantity,
    clearCart
  };
}
```

**Durée :** 1 jour

---

#### 4.3 Affichage Détaillé TVA dans TicketPanel.vue
```vue
<template>
  <div class="bg-white rounded-xl p-5 shadow-lg">
    <h2 class="text-xl font-bold mb-4">Ticket</h2>

    <!-- Articles -->
    <div v-for="item in items" :key="item.service.id" class="mb-3">
      <!-- ... -->
    </div>

    <!-- Totaux -->
    <div class="border-t pt-4 mt-4 space-y-2">
      <!-- Sous-total HT -->
      <div class="flex justify-between text-gray-600">
        <span>Sous-total HT</span>
        <span>{{ subtotalHT.toFixed(2) }} €</span>
      </div>

      <!-- TVA -->
      <div class="flex justify-between text-gray-600 text-sm">
        <span>TVA (20%)</span>
        <span>{{ totalTVA.toFixed(2) }} €</span>
      </div>

      <!-- Sous-total TTC -->
      <div class="flex justify-between font-semibold text-gray-900">
        <span>Sous-total TTC</span>
        <span>{{ subtotalTTC.toFixed(2) }} €</span>
      </div>

      <!-- Réduction -->
      <div v-if="discountAmount > 0" class="flex justify-between text-red-600">
        <span>Réduction {{ discountType === 'percent' ? `(${discountValue}%)` : '' }}</span>
        <span>-{{ discountAmount.toFixed(2) }} €</span>
      </div>

      <!-- Total -->
      <div class="flex justify-between text-xl font-bold text-gray-900 border-t pt-2">
        <span>TOTAL</span>
        <span>{{ total.toFixed(2) }} €</span>
      </div>
    </div>

    <!-- Moyens de paiement -->
    <!-- ... -->

    <!-- Validation -->
    <button @click="handleValidate" class="w-full bg-gray-900 text-white py-3 rounded-lg">
      Valider la vente
    </button>
  </div>
</template>

<script setup lang="ts">
import { useCart } from '../composables/useCart';
import apiClient from '../api/client';

const { items, subtotalHT, totalTVA, subtotalTTC, discountAmount, total, clearCart } = useCart();

const handleValidate = async () => {
  try {
    const response = await apiClient.post('/sales', {
      items: items.value.map(item => ({
        productId: item.service.id,
        quantity: item.quantity
      })),
      discountType: discountType.value.toUpperCase(),
      discountValue: discountValue.value,
      payments: [{ method: 'CASH', amount: total.value }] // À adapter
    });

    alert('Vente enregistrée ! Ticket : ' + response.data.ticketNumber);
    clearCart();
  } catch (error) {
    alert('Erreur : ' + error.message);
  }
};
</script>
```

**Durée :** 2 jours

---

### 5️⃣ Tests Phase 1 (Semaine 5)

#### Tests à Effectuer
- [ ] Backend API fonctionne (Postman/Insomnia)
- [ ] Authentification JWT valide
- [ ] Création de vente avec calculs HT/TVA/TTC corrects
- [ ] Stock décrémenté automatiquement
- [ ] Frontend connecté au backend
- [ ] Affichage détaillé TVA sur ticket
- [ ] Validation et enregistrement vente

**Durée :** 3-5 jours

---

## 📊 CHECKLIST PHASE 1

### Backend
- [ ] PostgreSQL installé et configuré
- [ ] Prisma ORM configuré
- [ ] Schéma BDD créé et migré
- [ ] API REST avec routes principales
- [ ] Authentification JWT fonctionnelle
- [ ] Validation Zod sur endpoints
- [ ] Gestion erreurs centralisée
- [ ] Variables d'environnement (.env)

### Frontend
- [ ] Client API (axios) configuré
- [ ] Calculs HT/TVA/TTC implémentés
- [ ] Affichage détaillé sur ticket
- [ ] Connexion au backend
- [ ] Validation et enregistrement vente
- [ ] Feedback utilisateur (toasts)
- [ ] Gestion erreurs API

### Tests
- [ ] Tests API (Postman)
- [ ] Tests manuels frontend
- [ ] Calculs vérifiés (TVA, remises)
- [ ] Stock testé
- [ ] Scénario complet vente de bout en bout

---

## 🎯 LIVRABLE PHASE 1

À la fin de la Phase 1, le client aura :
✅ Une page de caisse 100% fonctionnelle  
✅ Backend sécurisé avec API REST  
✅ Base de données PostgreSQL opérationnelle  
✅ Calculs HT/TVA/TTC corrects  
✅ Enregistrement des ventes en BDD  
✅ Gestion automatique du stock  
✅ Authentification des vendeurs  

**Le salon pourra utiliser la caisse en production pour les ventes simples.**

---

## ❓ QUESTIONS À POSER AU CLIENT

Avant de démarrer, confirmer avec le client :

1. **Hébergement**
   - Serveur local dans le salon ?
   - OU VPS cloud ?

2. **Ancienne application**
   - Format des données (SQL, Excel, autre) ?
   - Accès disponible pour extraction ?
   - Priorité migration : haute ou basse ?

3. **Imprimante thermique**
   - Marque et modèle ?
   - Branchement USB disponible ?

4. **Scanner code-barres**
   - Disponible ? Marque/modèle ?
   - OU à acheter ?

5. **Formation**
   - Préférence formation en ligne ou sur place ?
   - Disponibilité équipe pour tests ?

---

## 📞 SUPPORT

Pour toute question durant le développement :
- 📧 Email : [à définir]
- 📱 Téléphone : [à définir]
- 💬 Chat : [à définir]

---

**Document créé le :** 29 janvier 2026  
**Prochaine mise à jour :** Fin Phase 1

**🚀 PRÊT À COMMENCER LA PHASE 1 !**
