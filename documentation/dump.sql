


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."discount_type" AS ENUM (
    'euro',
    'percent'
);


ALTER TYPE "public"."discount_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'cash',
    'card',
    'contactless',
    'check',
    'gift_card',
    'amex'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."product_type" AS ENUM (
    'service',
    'product'
);


ALTER TYPE "public"."product_type" OWNER TO "postgres";


CREATE TYPE "public"."sale_status" AS ENUM (
    'pending',
    'completed',
    'cancelled',
    'refunded'
);


ALTER TYPE "public"."sale_status" OWNER TO "postgres";


CREATE TYPE "public"."stock_movement_type" AS ENUM (
    'in',
    'out',
    'adjustment'
);


ALTER TYPE "public"."stock_movement_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'manager',
    'vendor'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_ticket_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_ticket_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sales_stats"("p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("total_count" bigint, "total_amount" numeric, "avg_ticket" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    COUNT(*)::bigint,
    COALESCE(SUM(total), 0),
    COALESCE(AVG(total), 0)
  FROM sales
  WHERE (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
$$;


ALTER FUNCTION "public"."get_sales_stats"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."nf525_prevent_payment_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  sale_status text;
BEGIN
  SELECT status INTO sale_status FROM sales WHERE id = OLD.sale_id;
  IF sale_status = 'completed' THEN
    RAISE EXCEPTION 'NF525: Suppression interdite — paiement de vente validée';
  END IF;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."nf525_prevent_payment_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."nf525_prevent_payment_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  sale_status text;
BEGIN
  SELECT status INTO sale_status FROM sales WHERE id = OLD.sale_id;
  IF sale_status = 'completed' THEN
    RAISE EXCEPTION 'NF525: Modification interdite — paiement de vente validée';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."nf525_prevent_payment_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."nf525_prevent_sale_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'NF525: Suppression interdite — vente validée %', OLD.ticket_number;
  END IF;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."nf525_prevent_sale_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."nf525_prevent_sale_item_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  sale_status text;
BEGIN
  SELECT status INTO sale_status FROM sales WHERE id = OLD.sale_id;
  IF sale_status = 'completed' THEN
    RAISE EXCEPTION 'NF525: Suppression interdite — article de vente validée';
  END IF;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."nf525_prevent_sale_item_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."nf525_prevent_sale_item_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  sale_status text;
BEGIN
  SELECT status INTO sale_status FROM sales WHERE id = OLD.sale_id;
  IF sale_status = 'completed' THEN
    RAISE EXCEPTION 'NF525: Modification interdite — article de vente validée';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."nf525_prevent_sale_item_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."nf525_prevent_sale_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    -- Autoriser le changement de statut (annulation) et notes
    IF NEW.ticket_number   IS DISTINCT FROM OLD.ticket_number
    OR NEW.total           IS DISTINCT FROM OLD.total
    OR NEW.subtotal_ht     IS DISTINCT FROM OLD.subtotal_ht
    OR NEW.total_tva       IS DISTINCT FROM OLD.total_tva
    OR NEW.subtotal_ttc    IS DISTINCT FROM OLD.subtotal_ttc
    OR NEW.discount_value  IS DISTINCT FROM OLD.discount_value
    OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
    OR NEW.discount_type   IS DISTINCT FROM OLD.discount_type
    OR NEW.vendor_id       IS DISTINCT FROM OLD.vendor_id
    OR NEW.client_id       IS DISTINCT FROM OLD.client_id
    THEN
      RAISE EXCEPTION 'NF525: Modification interdite — champs financiers protégés (vente %)', OLD.ticket_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."nf525_prevent_sale_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."nf525_protect_audit_logs"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RAISE EXCEPTION 'NF525: Les journaux d''audit sont immuables';
END;
$$;


ALTER FUNCTION "public"."nf525_protect_audit_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."nf525_protect_grand_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.key = 'grand_total' THEN
    RAISE EXCEPTION 'NF525: Suppression interdite — Grand Total protégé';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.key = 'grand_total' THEN
    -- Le GT ne peut qu'augmenter
    IF (NEW.value::numeric) < (OLD.value::numeric) THEN
      RAISE EXCEPTION 'NF525: Le Grand Total ne peut pas diminuer (% -> %)', OLD.value, NEW.value;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."nf525_protect_grand_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."parse_birthday"("birthday_str" "text") RETURNS "date"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    parts TEXT[];
    day_val INT;
    month_val INT;
    year_val INT;
BEGIN
    IF birthday_str IS NULL OR birthday_str = '' THEN
        RETURN NULL;
    END IF;
    
    -- Nettoyer les espaces
    birthday_str := TRIM(birthday_str);
    
    -- Essayer de parser différents formats
    -- Format: dd/mm/yyyy ou dd/mm/yy ou dd/mm
    parts := string_to_array(birthday_str, '/');
    
    IF array_length(parts, 1) >= 2 THEN
        BEGIN
            day_val := parts[1]::INT;
            month_val := parts[2]::INT;
            
            IF array_length(parts, 1) = 3 THEN
                year_val := parts[3]::INT;
                -- Si année sur 2 chiffres
                IF year_val < 100 THEN
                    IF year_val > 50 THEN
                        year_val := 1900 + year_val;
                    ELSE
                        year_val := 2000 + year_val;
                    END IF;
                END IF;
            ELSE
                -- Pas d'année, on met une année par défaut (1970)
                year_val := 1970;
            END IF;
            
            -- Validation basique
            IF day_val BETWEEN 1 AND 31 AND month_val BETWEEN 1 AND 12 THEN
                RETURN make_date(year_val, month_val, day_val);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RETURN NULL;
        END;
    END IF;
    
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."parse_birthday"("birthday_str" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."products_compute_price_ttc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.price_ttc := NEW.price_ht * COALESCE(NEW.coef, 1 + NEW.tva_rate);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."products_compute_price_ttc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "event_type" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "vendor_id" "uuid",
    "ip_address" "text",
    "user_agent" "text",
    "hash" "text" NOT NULL,
    "previous_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cash_register_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "label" "text" NOT NULL,
    "vendor_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cash_movements_type_check" CHECK (("type" = ANY (ARRAY['in'::"text", 'out'::"text"])))
);


ALTER TABLE "public"."cash_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_registers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "vendor_id" "uuid",
    "opening_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "closing_amount" numeric(10,2),
    "expected_amount" numeric(10,2),
    "difference" numeric(10,2),
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "notes" "text",
    "opened_at" timestamp with time zone DEFAULT "now"(),
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cash_registers_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."cash_registers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "color" "text" DEFAULT '#6B7280'::"text",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "phone2" "text",
    "email" "text",
    "address" "text",
    "city" "text",
    "postal_code" "text",
    "birth_date" "date",
    "notes" "text",
    "loyalty_points" integer DEFAULT 0,
    "total_spent" numeric(10,2) DEFAULT 0,
    "visit_count" integer DEFAULT 0,
    "last_visit_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "old_mysql_id" bigint,
    "company" "text"
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clients"."company" IS 'Nom de l''entreprise du client (optionnel, pour facturation)';



CREATE TABLE IF NOT EXISTS "public"."daily_closures" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "closure_date" "date" NOT NULL,
    "total_sales" integer DEFAULT 0,
    "total_ht" numeric(10,2) DEFAULT 0,
    "total_tva" numeric(10,2) DEFAULT 0,
    "total_ttc" numeric(10,2) DEFAULT 0,
    "total_discounts" numeric(10,2) DEFAULT 0,
    "total_cash" numeric(10,2) DEFAULT 0,
    "total_card" numeric(10,2) DEFAULT 0,
    "total_contactless" numeric(10,2) DEFAULT 0,
    "total_check" numeric(10,2) DEFAULT 0,
    "total_gift_card" numeric(10,2) DEFAULT 0,
    "total_refunds" numeric(10,2) DEFAULT 0,
    "refund_count" integer DEFAULT 0,
    "hash" "text",
    "previous_hash" "text",
    "closed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_closures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "sale_id" "uuid",
    "points" integer NOT NULL,
    "type" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "loyalty_transactions_type_check" CHECK (("type" = ANY (ARRAY['earned'::"text", 'spent'::"text", 'expired'::"text", 'adjusted'::"text"])))
);


ALTER TABLE "public"."loyalty_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."migration_category_mapping" (
    "old_name" "text" NOT NULL,
    "new_id" "uuid" NOT NULL
);


ALTER TABLE "public"."migration_category_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."migration_client_mapping" (
    "old_id" bigint NOT NULL,
    "new_id" "uuid" NOT NULL
);


ALTER TABLE "public"."migration_client_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."migration_product_mapping" (
    "old_id" bigint NOT NULL,
    "is_article" boolean DEFAULT true NOT NULL,
    "new_id" "uuid" NOT NULL
);


ALTER TABLE "public"."migration_product_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."migration_sale_mapping" (
    "old_id" bigint NOT NULL,
    "new_id" "uuid" NOT NULL
);


ALTER TABLE "public"."migration_sale_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."migration_vendor_mapping" (
    "old_id" bigint NOT NULL,
    "new_id" "uuid" NOT NULL
);


ALTER TABLE "public"."migration_vendor_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "method" "public"."payment_method" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "price_modifier" numeric(10,2) DEFAULT 0,
    "stock" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" "text",
    "name" "text" NOT NULL,
    "description" "text",
    "type" "public"."product_type" DEFAULT 'service'::"public"."product_type" NOT NULL,
    "category_id" "uuid",
    "price_ht" numeric(10,2) NOT NULL,
    "tva_rate" numeric(5,4) DEFAULT 0.20,
    "price_ttc" numeric(10,2),
    "duration" integer,
    "stock" integer DEFAULT 0,
    "alert_threshold" integer DEFAULT 5,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "brand" "text",
    "model" "text",
    "old_mysql_id" bigint,
    "barcode" "text",
    "size" "text",
    "location" "text",
    "stock_technical" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."brand" IS 'Marque du produit';



COMMENT ON COLUMN "public"."products"."model" IS 'Modèle / référence';



COMMENT ON COLUMN "public"."products"."barcode" IS 'Code-barres (EAN, etc.) pour scan à la caisse — produits physiques uniquement';



CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "product_name" "text" NOT NULL,
    "price_ht" numeric(10,2) NOT NULL,
    "tva_rate" numeric(5,4) NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "subtotal_ht" numeric(10,2) NOT NULL,
    "tva" numeric(10,2) NOT NULL,
    "subtotal_ttc" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "vendor_id" "uuid"
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_number" "text" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "subtotal_ht" numeric(10,2) NOT NULL,
    "total_tva" numeric(10,2) NOT NULL,
    "subtotal_ttc" numeric(10,2) NOT NULL,
    "discount_type" "public"."discount_type" DEFAULT 'euro'::"public"."discount_type",
    "discount_value" numeric(10,2) DEFAULT 0,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "total" numeric(10,2) NOT NULL,
    "status" "public"."sale_status" DEFAULT 'completed'::"public"."sale_status",
    "notes" "text",
    "hash" "text",
    "previous_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "old_mysql_id" bigint
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "type" "public"."stock_movement_type" NOT NULL,
    "quantity" integer NOT NULL,
    "reason" "text" NOT NULL,
    "reference_id" "uuid",
    "vendor_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stock_type" "text" DEFAULT 'sale'::"text" NOT NULL
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "auth_user_id" "uuid",
    "email" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'vendor'::"public"."user_role",
    "color" "text" DEFAULT '#3B82F6'::"text",
    "initials" "text" GENERATED ALWAYS AS ("upper"((SUBSTRING("first_name" FROM 1 FOR 1) || SUBSTRING("last_name" FROM 1 FOR 1)))) STORED,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vendors" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_closures"
    ADD CONSTRAINT "daily_closures_closure_date_key" UNIQUE ("closure_date");



ALTER TABLE ONLY "public"."daily_closures"
    ADD CONSTRAINT "daily_closures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."migration_category_mapping"
    ADD CONSTRAINT "migration_category_mapping_pkey" PRIMARY KEY ("old_name");



ALTER TABLE ONLY "public"."migration_client_mapping"
    ADD CONSTRAINT "migration_client_mapping_pkey" PRIMARY KEY ("old_id");



ALTER TABLE ONLY "public"."migration_product_mapping"
    ADD CONSTRAINT "migration_product_mapping_new_pkey" PRIMARY KEY ("old_id", "is_article");



ALTER TABLE ONLY "public"."migration_sale_mapping"
    ADD CONSTRAINT "migration_sale_mapping_pkey" PRIMARY KEY ("old_id");



ALTER TABLE ONLY "public"."migration_vendor_mapping"
    ADD CONSTRAINT "migration_vendor_mapping_pkey" PRIMARY KEY ("old_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_ticket_number_key" UNIQUE ("ticket_number");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_event" ON "public"."audit_logs" USING "btree" ("event_type");



CREATE INDEX "idx_audit_logs_table" ON "public"."audit_logs" USING "btree" ("table_name");



CREATE INDEX "idx_audit_logs_timestamp" ON "public"."audit_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_cash_movements_register" ON "public"."cash_movements" USING "btree" ("cash_register_id");



CREATE INDEX "idx_cash_registers_date" ON "public"."cash_registers" USING "btree" ("date" DESC);



CREATE INDEX "idx_cash_registers_status" ON "public"."cash_registers" USING "btree" ("status");



CREATE INDEX "idx_clients_name" ON "public"."clients" USING "btree" ("last_name", "first_name");



CREATE INDEX "idx_clients_phone" ON "public"."clients" USING "btree" ("phone");



CREATE INDEX "idx_clients_search" ON "public"."clients" USING "gin" ("to_tsvector"('"french"'::"regconfig", (((("first_name" || ' '::"text") || "last_name") || ' '::"text") || "phone")));



CREATE INDEX "idx_daily_closures_date" ON "public"."daily_closures" USING "btree" ("closure_date");



CREATE INDEX "idx_loyalty_transactions_client" ON "public"."loyalty_transactions" USING "btree" ("client_id");



CREATE INDEX "idx_loyalty_transactions_created" ON "public"."loyalty_transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_loyalty_transactions_sale" ON "public"."loyalty_transactions" USING "btree" ("sale_id");



CREATE INDEX "idx_payments_method" ON "public"."payments" USING "btree" ("method");



CREATE INDEX "idx_payments_sale" ON "public"."payments" USING "btree" ("sale_id");



CREATE INDEX "idx_products_active" ON "public"."products" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_products_barcode" ON "public"."products" USING "btree" ("barcode") WHERE ("barcode" IS NOT NULL);



CREATE UNIQUE INDEX "idx_products_barcode_unique" ON "public"."products" USING "btree" ("barcode") WHERE ("barcode" IS NOT NULL);



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_code" ON "public"."products" USING "btree" ("code");



CREATE INDEX "idx_products_search" ON "public"."products" USING "gin" ("to_tsvector"('"french"'::"regconfig", (("name" || ' '::"text") || COALESCE("description", ''::"text"))));



CREATE INDEX "idx_products_type" ON "public"."products" USING "btree" ("type");



CREATE INDEX "idx_sale_items_product" ON "public"."sale_items" USING "btree" ("product_id");



CREATE INDEX "idx_sale_items_sale" ON "public"."sale_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sale_items_vendor" ON "public"."sale_items" USING "btree" ("vendor_id");



CREATE INDEX "idx_sales_client" ON "public"."sales" USING "btree" ("client_id");



CREATE INDEX "idx_sales_date" ON "public"."sales" USING "btree" ("created_at");



CREATE INDEX "idx_sales_status" ON "public"."sales" USING "btree" ("status");



CREATE INDEX "idx_sales_ticket" ON "public"."sales" USING "btree" ("ticket_number");



CREATE INDEX "idx_sales_vendor" ON "public"."sales" USING "btree" ("vendor_id");



CREATE INDEX "idx_stock_movements_date" ON "public"."stock_movements" USING "btree" ("created_at");



CREATE INDEX "idx_stock_movements_product" ON "public"."stock_movements" USING "btree" ("product_id");



CREATE INDEX "idx_variants_code" ON "public"."product_variants" USING "btree" ("code");



CREATE INDEX "idx_variants_product" ON "public"."product_variants" USING "btree" ("product_id");



CREATE INDEX "idx_vendors_auth_user" ON "public"."vendors" USING "btree" ("auth_user_id");



CREATE INDEX "idx_vendors_email" ON "public"."vendors" USING "btree" ("email");



CREATE UNIQUE INDEX "sales_old_mysql_id_key" ON "public"."sales" USING "btree" ("old_mysql_id") WHERE ("old_mysql_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "trg_nf525_no_delete_audit" BEFORE DELETE ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."nf525_protect_audit_logs"();



CREATE OR REPLACE TRIGGER "trg_nf525_no_delete_payment" BEFORE DELETE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."nf525_prevent_payment_delete"();



CREATE OR REPLACE TRIGGER "trg_nf525_no_delete_sale" BEFORE DELETE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."nf525_prevent_sale_delete"();



CREATE OR REPLACE TRIGGER "trg_nf525_no_delete_sale_item" BEFORE DELETE ON "public"."sale_items" FOR EACH ROW EXECUTE FUNCTION "public"."nf525_prevent_sale_item_delete"();



CREATE OR REPLACE TRIGGER "trg_nf525_no_update_audit" BEFORE UPDATE ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."nf525_protect_audit_logs"();



CREATE OR REPLACE TRIGGER "trg_nf525_no_update_payment" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."nf525_prevent_payment_update"();



CREATE OR REPLACE TRIGGER "trg_nf525_no_update_sale" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."nf525_prevent_sale_update"();



CREATE OR REPLACE TRIGGER "trg_nf525_no_update_sale_item" BEFORE UPDATE ON "public"."sale_items" FOR EACH ROW EXECUTE FUNCTION "public"."nf525_prevent_sale_item_update"();



CREATE OR REPLACE TRIGGER "trg_nf525_protect_gt" BEFORE DELETE OR UPDATE ON "public"."settings" FOR EACH ROW WHEN (("old"."key" = 'grand_total'::"text")) EXECUTE FUNCTION "public"."nf525_protect_grand_total"();



CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_product_variants_updated_at" BEFORE UPDATE ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_sales_updated_at" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_vendors_updated_at" BEFORE UPDATE ON "public"."vendors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_registers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."daily_closures"
    ADD CONSTRAINT "daily_closures_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all on cash_movements" ON "public"."cash_movements" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on cash_registers" ON "public"."cash_registers" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on categories" ON "public"."categories" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on loyalty_transactions" ON "public"."loyalty_transactions" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on payments" ON "public"."payments" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on products" ON "public"."products" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on sale_items" ON "public"."sale_items" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on sales" ON "public"."sales" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on vendors" ON "public"."vendors" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow anon read" ON "public"."categories" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anon read" ON "public"."products" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anon read" ON "public"."vendors" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow authenticated access" ON "public"."audit_logs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."categories" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."clients" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."daily_closures" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."payments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."product_variants" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."products" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."sale_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."sales" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."settings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."stock_movements" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated access" ON "public"."vendors" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow delete clients" ON "public"."clients" FOR DELETE TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow insert clients" ON "public"."clients" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Allow read clients" ON "public"."clients" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow update clients" ON "public"."clients" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Categories viewable by anon for maquette" ON "public"."categories" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Products deletable by anon for maquette" ON "public"."products" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Products insertable by anon for maquette" ON "public"."products" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Products updatable by anon for maquette" ON "public"."products" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Products viewable by anon for maquette" ON "public"."products" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Settings are manageable by all" ON "public"."settings" USING (true) WITH CHECK (true);



CREATE POLICY "Stock movements allow anon for maquette" ON "public"."stock_movements" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Vendors viewable by anon for maquette" ON "public"."vendors" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_audit_logs_insert" ON "public"."audit_logs" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "anon_audit_logs_select" ON "public"."audit_logs" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon_products_all" ON "public"."products" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "anon_stock_movements_all" ON "public"."stock_movements" TO "anon" USING (true) WITH CHECK (true);



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cash_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cash_registers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_closures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loyalty_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."generate_ticket_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_ticket_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_ticket_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sales_stats"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sales_stats"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sales_stats"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."nf525_prevent_payment_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."nf525_prevent_payment_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."nf525_prevent_payment_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."nf525_prevent_payment_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."nf525_prevent_payment_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."nf525_prevent_payment_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."nf525_prevent_sale_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."nf525_prevent_sale_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."nf525_prevent_sale_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."nf525_prevent_sale_item_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."nf525_prevent_sale_item_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."nf525_prevent_sale_item_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."nf525_prevent_sale_item_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."nf525_prevent_sale_item_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."nf525_prevent_sale_item_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."nf525_prevent_sale_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."nf525_prevent_sale_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."nf525_prevent_sale_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."nf525_protect_audit_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."nf525_protect_audit_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."nf525_protect_audit_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."nf525_protect_grand_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."nf525_protect_grand_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."nf525_protect_grand_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."parse_birthday"("birthday_str" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."parse_birthday"("birthday_str" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."parse_birthday"("birthday_str" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."products_compute_price_ttc"() TO "anon";
GRANT ALL ON FUNCTION "public"."products_compute_price_ttc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."products_compute_price_ttc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cash_movements" TO "anon";
GRANT ALL ON TABLE "public"."cash_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_movements" TO "service_role";



GRANT ALL ON TABLE "public"."cash_registers" TO "anon";
GRANT ALL ON TABLE "public"."cash_registers" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_registers" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."daily_closures" TO "anon";
GRANT ALL ON TABLE "public"."daily_closures" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_closures" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_transactions" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."migration_category_mapping" TO "anon";
GRANT ALL ON TABLE "public"."migration_category_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."migration_category_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."migration_client_mapping" TO "anon";
GRANT ALL ON TABLE "public"."migration_client_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."migration_client_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."migration_product_mapping" TO "anon";
GRANT ALL ON TABLE "public"."migration_product_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."migration_product_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."migration_sale_mapping" TO "anon";
GRANT ALL ON TABLE "public"."migration_sale_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."migration_sale_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."migration_vendor_mapping" TO "anon";
GRANT ALL ON TABLE "public"."migration_vendor_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."migration_vendor_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."vendors" TO "anon";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































