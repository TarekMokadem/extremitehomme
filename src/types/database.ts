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

// Type Database pour Supabase
export interface Database {
  public: {
    Tables: {
      vendors: {
        Row: Vendor;
        Insert: Omit<Vendor, 'id' | 'initials' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Vendor, 'id' | 'initials'>>;
      };
      clients: {
        Row: Client;
        Insert: Omit<Client, 'id' | 'loyalty_points' | 'total_spent' | 'visit_count' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Client, 'id'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'>;
        Update: Partial<Omit<Category, 'id'>>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'price_ttc' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Product, 'id' | 'price_ttc'>>;
      };
      product_variants: {
        Row: ProductVariant;
        Insert: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProductVariant, 'id'>>;
      };
      sales: {
        Row: Sale;
        Insert: Omit<Sale, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Sale, 'id'>>;
      };
      sale_items: {
        Row: SaleItem;
        Insert: Omit<SaleItem, 'id' | 'created_at'>;
        Update: Partial<Omit<SaleItem, 'id'>>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, 'id' | 'created_at'>;
        Update: Partial<Omit<Payment, 'id'>>;
      };
      stock_movements: {
        Row: StockMovement;
        Insert: Omit<StockMovement, 'id' | 'created_at'>;
        Update: Partial<Omit<StockMovement, 'id'>>;
      };
      daily_closures: {
        Row: DailyClosure;
        Insert: Omit<DailyClosure, 'id' | 'created_at'>;
        Update: Partial<Omit<DailyClosure, 'id'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: never; // Audit logs should never be updated
      };
      settings: {
        Row: Setting;
        Insert: Omit<Setting, 'id' | 'updated_at'>;
        Update: Partial<Omit<Setting, 'id'>>;
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
