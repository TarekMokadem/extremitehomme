// Types générés pour Supabase
// Ces types correspondent au schéma de la base de données

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Énumérations
export type UserRole = 'admin' | 'manager' | 'vendor';
export type ProductType = 'service' | 'product';
export type DiscountType = 'euro' | 'percent';
export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'contactless' | 'check' | 'gift_card';
export type StockMovementType = 'in' | 'out' | 'adjustment';

// Tables
export interface Vendor {
  id: string;
  auth_user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  color: string;
  initials: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone2: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  birth_date: string | null;
  notes: string | null;
  loyalty_points: number;
  total_spent: number;
  visit_count: number;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  type: ProductType;
  category_id: string | null;
  price_ht: number;
  tva_rate: number;
  price_ttc: number;
  duration: number | null;
  stock: number;
  alert_threshold: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Relations
  category?: Category;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  code: string | null;
  price_modifier: number;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  product?: Product;
}

export interface Sale {
  id: string;
  ticket_number: string;
  vendor_id: string;
  client_id: string | null;
  subtotal_ht: number;
  total_tva: number;
  subtotal_ttc: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  total: number;
  status: SaleStatus;
  notes: string | null;
  hash: string | null;
  previous_hash: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  vendor?: Vendor;
  client?: Client;
  items?: SaleItem[];
  payments?: Payment[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  variant_id: string | null;
  vendor_id: string | null; // Vendeur qui a réalisé ce service
  product_name: string;
  price_ht: number;
  tva_rate: number;
  quantity: number;
  subtotal_ht: number;
  tva: number;
  subtotal_ttc: number;
  created_at: string;
  // Relations
  product?: Product;
  variant?: ProductVariant;
  vendor?: Vendor;
}

export interface Payment {
  id: string;
  sale_id: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  variant_id: string | null;
  type: StockMovementType;
  quantity: number;
  reason: string;
  reference_id: string | null;
  vendor_id: string | null;
  created_at: string;
  // Relations
  product?: Product;
  variant?: ProductVariant;
  vendor?: Vendor;
}

export interface DailyClosure {
  id: string;
  closure_date: string;
  total_sales: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  total_discounts: number;
  total_cash: number;
  total_card: number;
  total_contactless: number;
  total_check: number;
  total_gift_card: number;
  total_refunds: number;
  refund_count: number;
  hash: string | null;
  previous_hash: string | null;
  closed_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  event_type: string;
  table_name: string;
  record_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
  vendor_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  hash: string;
  previous_hash: string | null;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: Json;
  description: string | null;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  client_id: string;
  vendor_id: string;
  sale_id: string | null;
  points: number;
  type: 'earned' | 'spent' | 'expired' | 'adjusted';
  notes: string | null;
  created_at: string;
}

export interface CashRegister {
  id: string;
  date: string;
  vendor_id: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  status: 'open' | 'closed';
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  // Relations
  vendor?: Vendor;
  movements?: CashMovement[];
}

export interface CashMovement {
  id: string;
  cash_register_id: string;
  type: 'in' | 'out';
  amount: number;
  label: string;
  vendor_id: string | null;
  created_at: string;
  // Relations
  vendor?: Vendor;
}

// Type Database pour Supabase - Simplifié pour éviter les erreurs de types
export type Database = {
  public: {
    Tables: {
      vendors: {
        Row: Vendor;
        Insert: Partial<Vendor>;
        Update: Partial<Vendor>;
      };
      clients: {
        Row: Client;
        Insert: Partial<Client>;
        Update: Partial<Client>;
      };
      categories: {
        Row: Category;
        Insert: Partial<Category>;
        Update: Partial<Category>;
      };
      products: {
        Row: Product;
        Insert: Partial<Product>;
        Update: Partial<Product>;
      };
      product_variants: {
        Row: ProductVariant;
        Insert: Partial<ProductVariant>;
        Update: Partial<ProductVariant>;
      };
      sales: {
        Row: Sale;
        Insert: Partial<Sale>;
        Update: Partial<Sale>;
      };
      sale_items: {
        Row: SaleItem;
        Insert: Partial<SaleItem>;
        Update: Partial<SaleItem>;
      };
      payments: {
        Row: Payment;
        Insert: Partial<Payment>;
        Update: Partial<Payment>;
      };
      stock_movements: {
        Row: StockMovement;
        Insert: Partial<StockMovement>;
        Update: Partial<StockMovement>;
      };
      daily_closures: {
        Row: DailyClosure;
        Insert: Partial<DailyClosure>;
        Update: Partial<DailyClosure>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Partial<AuditLog>;
        Update: Partial<AuditLog>;
      };
      settings: {
        Row: Setting;
        Insert: Partial<Setting>;
        Update: Partial<Setting>;
      };
      loyalty_transactions: {
        Row: LoyaltyTransaction;
        Insert: Partial<LoyaltyTransaction>;
        Update: Partial<LoyaltyTransaction>;
      };
    };
    Functions: {
      generate_ticket_number: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
}

// Types utilitaires pour les formulaires
export type VendorInsert = Database['public']['Tables']['vendors']['Insert'];
export type ClientInsert = Database['public']['Tables']['clients']['Insert'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type SaleInsert = Database['public']['Tables']['sales']['Insert'];
export type SaleItemInsert = Database['public']['Tables']['sale_items']['Insert'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

// Types pour le panier (frontend uniquement)
export interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  // Vendeur associé à cet article (peut être différent par ligne)
  vendor_id?: string;
  vendor?: Vendor;
  // Calculés
  price_ht: number;
  tva_rate: number;
  subtotal_ht: number;
  tva: number;
  subtotal_ttc: number;
}

// Type pour l'utilisateur connecté
export interface AuthUser {
  id: string;
  email: string;
  vendor?: Vendor;
}
