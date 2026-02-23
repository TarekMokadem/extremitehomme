# 🚀 GUIDE SUPABASE - Setup Complet

**Projet :** Application de Caisse - Extrémités Homme  
**Date :** 29 janvier 2026  
**Hébergement :** 100% GRATUIT

---

## 🎯 POURQUOI SUPABASE ?

### Avantages

| Feature | Gratuit | Ce qu'on utilise |
|---------|---------|------------------|
| PostgreSQL | 500 MB | ~50 MB/an estimé ✅ |
| API REST auto | Illimité | Toutes les tables ✅ |
| Auth (JWT) | 50K users | ~10 vendeurs ✅ |
| Storage | 1 GB | Logos, images ✅ |
| Realtime | 200 connexions | Non nécessaire |
| Edge Functions | 500K/mois | Pour logique custom si besoin |

### Ce qu'on n'a PAS à coder

- ❌ ~~Backend Express~~
- ❌ ~~Routes API~~
- ❌ ~~Controllers~~
- ❌ ~~Authentification JWT~~
- ❌ ~~Gestion des sessions~~
- ❌ ~~Connexion PostgreSQL~~
- ❌ ~~Validation des données~~

**→ Supabase fait tout ça automatiquement !**

---

## 📋 ÉTAPE 1 : Créer le Projet Supabase

### 1.1 Inscription

1. Aller sur **https://supabase.com**
2. Cliquer sur **"Start your project"**
3. Se connecter avec **GitHub** (recommandé) ou email
4. Autoriser l'accès

### 1.2 Créer un Nouveau Projet

1. Cliquer sur **"New Project"**
2. Remplir les informations :

```
Organization: [Créer ou sélectionner]
Project name: caisse-extremites
Database Password: [Générer un mot de passe fort - NOTER LE !]
Region: West EU (Paris) - pour la France
Pricing Plan: Free
```

3. Cliquer sur **"Create new project"**
4. Attendre ~2 minutes que le projet soit créé

### 1.3 Récupérer les Clés API

Une fois le projet créé :

1. Aller dans **Settings** (icône engrenage) → **API**
2. Noter ces informations :

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon (public) key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (GARDER SECRET !)
```

⚠️ **IMPORTANT :**
- `anon key` : Utilisée côté frontend (publique, OK)
- `service_role key` : JAMAIS côté frontend (accès admin total)

---

## 📋 ÉTAPE 2 : Créer le Schéma de Base de Données

### 2.1 Accéder à l'Éditeur SQL

1. Dans Supabase Dashboard
2. Cliquer sur **"SQL Editor"** (icône terminal)
3. Cliquer sur **"New query"**

### 2.2 Exécuter le Script de Création

Copier et exécuter ce script SQL complet :

```sql
-- =====================================================
-- SCHÉMA BASE DE DONNÉES - CAISSE EXTRÉMITÉS HOMME
-- Supabase / PostgreSQL
-- Date: 29 janvier 2026
-- =====================================================

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. TYPES ÉNUMÉRÉS
-- =====================================================

-- Rôles utilisateurs
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'vendor');

-- Types de produits
CREATE TYPE product_type AS ENUM ('service', 'product');

-- Types de réduction
CREATE TYPE discount_type AS ENUM ('euro', 'percent');

-- Statuts de vente
CREATE TYPE sale_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');

-- Méthodes de paiement
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'contactless', 'check', 'gift_card');

-- Types de mouvement de stock
CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'adjustment');

-- =====================================================
-- 3. TABLE: VENDORS (Vendeurs/Utilisateurs)
-- =====================================================
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role DEFAULT 'vendor',
    color TEXT DEFAULT '#3B82F6',
    initials TEXT GENERATED ALWAYS AS (
        UPPER(SUBSTRING(first_name FROM 1 FOR 1) || SUBSTRING(last_name FROM 1 FOR 1))
    ) STORED,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_vendors_email ON vendors(email);
CREATE INDEX idx_vendors_auth_user ON vendors(auth_user_id);

-- =====================================================
-- 4. TABLE: CLIENTS
-- =====================================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone2 TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    birth_date DATE,
    notes TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_visit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_name ON clients(last_name, first_name);
CREATE INDEX idx_clients_search ON clients USING GIN (
    to_tsvector('french', first_name || ' ' || last_name || ' ' || phone)
);

-- =====================================================
-- 5. TABLE: CATEGORIES
-- =====================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6B7280',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Données initiales des catégories
INSERT INTO categories (name, slug, color, display_order) VALUES
    ('Coupes', 'coupes', '#3B82F6', 1),
    ('Barbe', 'barbe', '#F59E0B', 2),
    ('Soins', 'soins', '#10B981', 3),
    ('Épilation', 'epilation', '#EC4899', 4),
    ('Massage', 'massage', '#8B5CF6', 5),
    ('Produits', 'produits', '#6B7280', 6),
    ('Autres', 'autres', '#9CA3AF', 99);

-- =====================================================
-- 6. TABLE: PRODUCTS (Services et Produits)
-- =====================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE,  -- "1V", "2B", code-barres
    name TEXT NOT NULL,
    description TEXT,
    type product_type NOT NULL DEFAULT 'service',
    category_id UUID REFERENCES categories(id),
    price_ht DECIMAL(10,2) NOT NULL,  -- Prix HT
    tva_rate DECIMAL(5,4) DEFAULT 0.20,  -- 20%
    price_ttc DECIMAL(10,2) GENERATED ALWAYS AS (
        price_ht * (1 + tva_rate)
    ) STORED,
    duration INTEGER,  -- Durée en minutes (pour services)
    stock INTEGER DEFAULT 0,  -- Quantité en stock (pour produits)
    alert_threshold INTEGER DEFAULT 5,  -- Seuil alerte stock
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_search ON products USING GIN (
    to_tsvector('french', name || ' ' || COALESCE(description, ''))
);

-- =====================================================
-- 7. TABLE: PRODUCT_VARIANTS (Variantes de produits)
-- =====================================================
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,  -- "Rouge", "Taille M"
    code TEXT UNIQUE,  -- Code-barres EAN13
    price_modifier DECIMAL(10,2) DEFAULT 0,  -- +/- sur prix de base
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_code ON product_variants(code);

-- =====================================================
-- 8. TABLE: SALES (Ventes/Tickets)
-- =====================================================
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE NOT NULL,  -- "T-20260129-0001"
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    client_id UUID REFERENCES clients(id),
    
    -- Totaux
    subtotal_ht DECIMAL(10,2) NOT NULL,
    total_tva DECIMAL(10,2) NOT NULL,
    subtotal_ttc DECIMAL(10,2) NOT NULL,
    
    -- Réduction
    discount_type discount_type DEFAULT 'euro',
    discount_value DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Total final
    total DECIMAL(10,2) NOT NULL,
    
    -- Métadonnées
    status sale_status DEFAULT 'completed',
    notes TEXT,
    
    -- NF525 - Traçabilité
    hash TEXT,  -- Hash de la transaction
    previous_hash TEXT,  -- Hash de la transaction précédente
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche et rapports
CREATE INDEX idx_sales_ticket ON sales(ticket_number);
CREATE INDEX idx_sales_vendor ON sales(vendor_id);
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);

-- =====================================================
-- 9. TABLE: SALE_ITEMS (Lignes de vente)
-- =====================================================
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    
    -- Snapshot au moment de la vente
    product_name TEXT NOT NULL,
    price_ht DECIMAL(10,2) NOT NULL,
    tva_rate DECIMAL(5,4) NOT NULL,
    
    -- Quantité et totaux
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal_ht DECIMAL(10,2) NOT NULL,
    tva DECIMAL(10,2) NOT NULL,
    subtotal_ttc DECIMAL(10,2) NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- =====================================================
-- 10. TABLE: PAYMENTS (Paiements)
-- =====================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    method payment_method NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference TEXT,  -- Numéro de chèque, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_method ON payments(method);

-- =====================================================
-- 11. TABLE: STOCK_MOVEMENTS (Mouvements de stock)
-- =====================================================
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    type stock_movement_type NOT NULL,
    quantity INTEGER NOT NULL,  -- Positif ou négatif
    reason TEXT NOT NULL,  -- "Vente", "Livraison", "Inventaire"
    reference_id UUID,  -- ID de la vente ou commande
    vendor_id UUID REFERENCES vendors(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);

-- =====================================================
-- 12. TABLE: DAILY_CLOSURES (Clôtures journalières - NF525)
-- =====================================================
CREATE TABLE daily_closures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    closure_date DATE UNIQUE NOT NULL,
    
    -- Totaux du jour
    total_sales INTEGER DEFAULT 0,
    total_ht DECIMAL(10,2) DEFAULT 0,
    total_tva DECIMAL(10,2) DEFAULT 0,
    total_ttc DECIMAL(10,2) DEFAULT 0,
    total_discounts DECIMAL(10,2) DEFAULT 0,
    
    -- Par méthode de paiement
    total_cash DECIMAL(10,2) DEFAULT 0,
    total_card DECIMAL(10,2) DEFAULT 0,
    total_contactless DECIMAL(10,2) DEFAULT 0,
    total_check DECIMAL(10,2) DEFAULT 0,
    total_gift_card DECIMAL(10,2) DEFAULT 0,
    
    -- Annulations/Remboursements
    total_refunds DECIMAL(10,2) DEFAULT 0,
    refund_count INTEGER DEFAULT 0,
    
    -- NF525
    hash TEXT,
    previous_hash TEXT,
    
    closed_by UUID REFERENCES vendors(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_daily_closures_date ON daily_closures(closure_date);

-- =====================================================
-- 13. TABLE: AUDIT_LOGS (Journal d'audit - NF525)
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    event_type TEXT NOT NULL,  -- "sale_created", "sale_cancelled", etc.
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    vendor_id UUID REFERENCES vendors(id),
    ip_address TEXT,
    user_agent TEXT,
    hash TEXT NOT NULL,
    previous_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_event ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);

-- =====================================================
-- 14. TABLE: SETTINGS (Paramètres)
-- =====================================================
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paramètres par défaut
INSERT INTO settings (key, value, description) VALUES
    ('salon_info', '{"name": "Extrémités Homme", "address": "", "phone": "", "siret": ""}', 'Informations du salon'),
    ('tva_rates', '{"normal": 0.20, "reduced": 0.10, "super_reduced": 0.055}', 'Taux de TVA'),
    ('ticket_header', '{"line1": "Extrémités Homme", "line2": "", "line3": ""}', 'En-tête des tickets'),
    ('ticket_footer', '{"line1": "Merci de votre visite !", "line2": ""}', 'Pied de page des tickets'),
    ('loyalty', '{"points_per_euro": 1, "euros_per_point": 0.01, "enabled": false}', 'Programme de fidélité'),
    ('current_ticket_number', '{"date": "", "counter": 0}', 'Compteur de tickets');

-- =====================================================
-- 15. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour générer un numéro de ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    today TEXT;
    counter INTEGER;
    ticket TEXT;
BEGIN
    today := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Récupérer et incrémenter le compteur
    UPDATE settings 
    SET value = jsonb_set(
        jsonb_set(value, '{date}', to_jsonb(today)),
        '{counter}',
        to_jsonb(
            CASE 
                WHEN value->>'date' = today THEN (value->>'counter')::INTEGER + 1
                ELSE 1
            END
        )
    )
    WHERE key = 'current_ticket_number'
    RETURNING (value->>'counter')::INTEGER INTO counter;
    
    ticket := 'T-' || today || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN ticket;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 16. TRIGGERS
-- =====================================================

-- Triggers pour updated_at
CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 17. DONNÉES INITIALES - SERVICES
-- =====================================================

-- Récupérer les IDs des catégories
DO $$
DECLARE
    cat_coupes UUID;
    cat_barbe UUID;
    cat_soins UUID;
    cat_epilation UUID;
    cat_massage UUID;
    cat_autres UUID;
BEGIN
    SELECT id INTO cat_coupes FROM categories WHERE slug = 'coupes';
    SELECT id INTO cat_barbe FROM categories WHERE slug = 'barbe';
    SELECT id INTO cat_soins FROM categories WHERE slug = 'soins';
    SELECT id INTO cat_epilation FROM categories WHERE slug = 'epilation';
    SELECT id INTO cat_massage FROM categories WHERE slug = 'massage';
    SELECT id INTO cat_autres FROM categories WHERE slug = 'autres';

    -- Services Coupes (prix HT, TVA 20% appliquée automatiquement)
    INSERT INTO products (code, name, type, category_id, price_ht, duration, display_order) VALUES
        ('C01', 'Coupe Homme', 'service', cat_coupes, 16.67, 30, 1),
        ('C02', 'Coupe Enfant', 'service', cat_coupes, 12.50, 20, 2),
        ('C03', 'Coupe + Barbe', 'service', cat_coupes, 25.00, 45, 3),
        ('C04', 'Coupe Tondeuse', 'service', cat_coupes, 10.83, 15, 4),
        ('C05', 'Coupe Dégradé', 'service', cat_coupes, 20.83, 35, 5);

    -- Services Barbe
    INSERT INTO products (code, name, type, category_id, price_ht, duration, display_order) VALUES
        ('B01', 'Taille Barbe', 'service', cat_barbe, 10.00, 15, 1),
        ('B02', 'Rasage Traditionnel', 'service', cat_barbe, 16.67, 25, 2),
        ('B03', 'Soin Barbe Complet', 'service', cat_barbe, 25.00, 30, 3);

    -- Services Soins
    INSERT INTO products (code, name, type, category_id, price_ht, duration, display_order) VALUES
        ('S01', 'Soin Visage', 'service', cat_soins, 25.00, 30, 1),
        ('S02', 'Gommage', 'service', cat_soins, 20.83, 25, 2),
        ('S03', 'Masque Hydratant', 'service', cat_soins, 16.67, 20, 3);

    -- Services Épilation
    INSERT INTO products (code, name, type, category_id, price_ht, duration, display_order) VALUES
        ('E01', 'Sourcils', 'service', cat_epilation, 5.00, 10, 1),
        ('E02', 'Nez', 'service', cat_epilation, 4.17, 5, 2),
        ('E03', 'Oreilles', 'service', cat_epilation, 4.17, 5, 3);

    -- Services Massage
    INSERT INTO products (code, name, type, category_id, price_ht, duration, display_order) VALUES
        ('M01', 'Massage Crânien', 'service', cat_massage, 12.50, 15, 1),
        ('M02', 'Massage Nuque', 'service', cat_massage, 10.00, 10, 2),
        ('M03', 'Massage Complet', 'service', cat_massage, 33.33, 30, 3);

END $$;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

-- Vérification
SELECT 'Tables créées avec succès !' AS status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

### 2.3 Vérifier la Création

Après exécution :
1. Aller dans **Table Editor** (icône base de données)
2. Vérifier que toutes les tables sont créées :
   - vendors
   - clients
   - categories
   - products
   - product_variants
   - sales
   - sale_items
   - payments
   - stock_movements
   - daily_closures
   - audit_logs
   - settings

---

## 📋 ÉTAPE 3 : Configurer l'Authentification

### 3.1 Paramètres Auth

1. Aller dans **Authentication** → **Providers**
2. Activer **Email** (déjà activé par défaut)
3. Désactiver "Confirm email" pour simplifier (optionnel)

### 3.2 Créer le Premier Utilisateur Admin

1. Aller dans **Authentication** → **Users**
2. Cliquer sur **"Add user"**
3. Remplir :

```
Email: admin@extremites.fr
Password: [Mot de passe fort]
Auto Confirm User: ✅ Cocher
```

4. Cliquer sur **"Create user"**

### 3.3 Lier l'Auth à la Table Vendors

Exécuter dans **SQL Editor** :

```sql
-- Créer le vendor admin
INSERT INTO vendors (auth_user_id, email, first_name, last_name, role, color)
SELECT 
    id,
    email,
    'Admin',
    'Système',
    'admin',
    '#EF4444'
FROM auth.users
WHERE email = 'admin@extremites.fr';

-- Créer les vendeurs de test
INSERT INTO vendors (email, first_name, last_name, role, color) VALUES
    ('marie@extremites.fr', 'Marie', 'Martin', 'vendor', '#3B82F6'),
    ('jean@extremites.fr', 'Jean', 'Dupont', 'vendor', '#10B981'),
    ('sophie@extremites.fr', 'Sophie', 'Bernard', 'vendor', '#F59E0B'),
    ('lucas@extremites.fr', 'Lucas', 'Petit', 'vendor', '#8B5CF6');
```

---

## 📋 ÉTAPE 4 : Configurer Row Level Security (RLS)

### 4.1 Activer RLS sur les Tables

Exécuter dans **SQL Editor** :

```sql
-- =====================================================
-- ROW LEVEL SECURITY (RLS) - SÉCURITÉ
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES - Qui peut faire quoi
-- =====================================================

-- VENDORS: Tout le monde authentifié peut voir les vendeurs
CREATE POLICY "Vendors are viewable by authenticated users"
    ON vendors FOR SELECT
    TO authenticated
    USING (true);

-- VENDORS: Seul admin peut modifier
CREATE POLICY "Only admins can modify vendors"
    ON vendors FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vendors v
            WHERE v.auth_user_id = auth.uid()
            AND v.role = 'admin'
        )
    );

-- CLIENTS: Tout le monde authentifié peut voir et modifier
CREATE POLICY "Clients are manageable by authenticated users"
    ON clients FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- CATEGORIES: Tout le monde peut voir, admin peut modifier
CREATE POLICY "Categories are viewable by all"
    ON categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can modify categories"
    ON categories FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vendors v
            WHERE v.auth_user_id = auth.uid()
            AND v.role = 'admin'
        )
    );

-- PRODUCTS: Tout le monde peut voir, admin peut modifier
CREATE POLICY "Products are viewable by authenticated users"
    ON products FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can modify products"
    ON products FOR INSERT UPDATE DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vendors v
            WHERE v.auth_user_id = auth.uid()
            AND v.role IN ('admin', 'manager')
        )
    );

-- PRODUCT_VARIANTS: Même que products
CREATE POLICY "Variants are viewable by authenticated users"
    ON product_variants FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can modify variants"
    ON product_variants FOR INSERT UPDATE DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vendors v
            WHERE v.auth_user_id = auth.uid()
            AND v.role IN ('admin', 'manager')
        )
    );

-- SALES: Tout le monde authentifié peut créer et voir
CREATE POLICY "Sales are manageable by authenticated users"
    ON sales FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- SALE_ITEMS: Suit les ventes
CREATE POLICY "Sale items follow sales policy"
    ON sale_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- PAYMENTS: Suit les ventes
CREATE POLICY "Payments follow sales policy"
    ON payments FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- STOCK_MOVEMENTS: Tout le monde authentifié
CREATE POLICY "Stock movements are manageable by authenticated users"
    ON stock_movements FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- DAILY_CLOSURES: Admin et manager
CREATE POLICY "Daily closures viewable by authenticated users"
    ON daily_closures FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only managers can create closures"
    ON daily_closures FOR INSERT UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vendors v
            WHERE v.auth_user_id = auth.uid()
            AND v.role IN ('admin', 'manager')
        )
    );

-- AUDIT_LOGS: Lecture seule pour tous, écriture automatique
CREATE POLICY "Audit logs are readable by authenticated users"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (true);

-- SETTINGS: Lecture pour tous, modification admin
CREATE POLICY "Settings are viewable by authenticated users"
    ON settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can modify settings"
    ON settings FOR INSERT UPDATE DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vendors v
            WHERE v.auth_user_id = auth.uid()
            AND v.role = 'admin'
        )
    );

-- =====================================================
-- FIN RLS
-- =====================================================
SELECT 'RLS configuré avec succès !' AS status;
```

---

## 📋 ÉTAPE 5 : Configurer le Frontend

### 5.1 Installer Supabase Client

```bash
cd "C:\Users\Tarek Mokadem\Desktop\Projets\Caisse maquette"
npm install @supabase/supabase-js
```

### 5.2 Créer le Fichier de Configuration

Créer `src/lib/supabase.ts` :

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### 5.3 Créer le Fichier .env

Créer `.env` à la racine du projet :

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5.4 Ajouter .env au .gitignore

Vérifier que `.env` est dans `.gitignore` :

```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

---

## 📋 ÉTAPE 6 : Tester la Connexion

### 6.1 Test Rapide

Créer un fichier de test temporaire `src/test-supabase.ts` :

```typescript
import { supabase } from './lib/supabase';

async function testConnection() {
  // Test 1: Connexion
  console.log('Test connexion Supabase...');
  
  // Test 2: Lire les catégories
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*');
  
  if (error) {
    console.error('Erreur:', error);
  } else {
    console.log('Catégories:', categories);
  }
  
  // Test 3: Lire les produits
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*, categories(name)')
    .limit(5);
  
  if (productError) {
    console.error('Erreur produits:', productError);
  } else {
    console.log('Produits:', products);
  }
}

testConnection();
```

---

## 📦 Migration depuis MySQL + Backfill codes-barres

Si vous migrez depuis l'ancienne base MySQL :

1. **Exécuter le script de migration** : `python migration_script.py` génère les fichiers dans `migration_output/`
2. **Exécuter les SQL** dans Supabase SQL Editor (dans l'ordre : schéma, clients, produits, etc.)
3. **Ajouter la colonne barcode** : exécuter `PRODUCTS-BARCODE.sql`
4. **Backfill des codes-barres** :
   ```bash
   python backfill_barcodes.py
   ```
   Puis exécuter `migration_output/backfill_barcodes.sql` dans Supabase.

Le script extrait les codes-barres de `produit_code_barre` et `stock` (MySQL) et met à jour `products.barcode` via `migration_product_mapping`.

---

## 🎯 RÉCAPITULATIF

### Ce Qui Est Configuré

✅ Projet Supabase créé  
✅ Base de données PostgreSQL (13 tables)  
✅ Catégories et services initiaux  
✅ Authentification JWT  
✅ Row Level Security (sécurité)  
✅ Fonctions utilitaires (numéro ticket, etc.)  
✅ Triggers automatiques (updated_at)  
✅ Client frontend configuré  

### Tables Créées

| Table | Description | Utilisée pour |
|-------|-------------|---------------|
| vendors | Vendeurs/utilisateurs | Auth, ventes |
| clients | Clients du salon | Ventes, fidélité |
| categories | Catégories de services | Organisation |
| products | Services et produits | Caisse |
| product_variants | Variantes | Stock |
| sales | Ventes/tickets | Caisse |
| sale_items | Lignes de vente | Détails |
| payments | Paiements | Multi-paiement |
| stock_movements | Mouvements stock | Traçabilité |
| daily_closures | Clôtures jour | NF525 |
| audit_logs | Journal audit | NF525 |
| settings | Paramètres | Config |

### URLs Importantes

```
Dashboard: https://app.supabase.com/project/[votre-projet]
API URL: https://[votre-projet].supabase.co
Docs: https://supabase.com/docs
```

---

## 🚀 PROCHAINE ÉTAPE

1. **Créer les composables** pour interagir avec Supabase
2. **Mettre à jour les composants** existants
3. **Tester** les opérations CRUD
4. **Déployer le frontend** sur Vercel (gratuit)

---

**Document créé le :** 29 janvier 2026  
**Dernière mise à jour :** 29 janvier 2026
