/*
# Gutene Kitchen — Full Restaurant Schema

1. Purpose
   Creates the complete database schema for the Gutene Kitchen restaurant admin dashboard
   and customer website. Single-tenant, no auth — the admin dashboard uses the anon key
   with open CRUD policies so both the dashboard and the public site can read/write.

2. New Tables
   - restaurant_settings: singleton row holding all restaurant configuration (name, hero, hours, payment, etc.)
   - menu_categories: groups for menu items (e.g. Starters, Mains)
   - menu_items: individual dishes with price, flags, image, sort_order
   - menu_item_options: option groups for a menu item (e.g. Size, Extras) with required + max_select
   - menu_item_option_values: individual choices within an option group, each with a price modifier
   - orders: customer orders with status, payment, totals, customer info
   - order_items: line items within an order, snapshot of item name/price/qty/selected options

3. Security
   - RLS enabled on every table.
   - All policies are TO anon, authenticated with USING (true) / WITH CHECK (true) because this is
     a single-tenant app with no sign-in screen — the data is intentionally shared between the
     admin dashboard and the public customer website.

4. Indexes
   - menu_items.category_id for category joins
   - menu_item_options.item_id for item joins
   - menu_item_option_values.option_id for option joins
   - orders.status, orders.created_at for dashboard filtering
   - order_items.order_id for order detail joins

5. Notes
   - restaurant_settings has a single row with id = 1 enforced by a CHECK constraint.
   - order_number is a human-readable sequential-ish number derived from created_at.
   - All jsonb columns use sensible defaults so the app never reads null.
*/

-- ===== restaurant_settings (singleton) =====
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL DEFAULT 'Gutene Kitchen',
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  hero_title text NOT NULL DEFAULT '',
  hero_subtitle text NOT NULL DEFAULT '',
  hero_description text NOT NULL DEFAULT '',
  hero_bg text NOT NULL DEFAULT '',
  logo text NOT NULL DEFAULT '',
  cta_buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
  enable_delivery boolean NOT NULL DEFAULT true,
  enable_pickup boolean NOT NULL DEFAULT true,
  enable_dinein boolean NOT NULL DEFAULT true,
  primary_color text NOT NULL DEFAULT '#D4A853',
  minimum_order numeric NOT NULL DEFAULT 0,
  social_links jsonb NOT NULL DEFAULT '{"instagram":"","facebook":"","telegram":""}'::jsonb,
  is_open boolean NOT NULL DEFAULT true,
  opening_hours jsonb NOT NULL DEFAULT '{"mon":"9:00-22:00","tue":"9:00-22:00","wed":"9:00-22:00","thu":"9:00-22:00","fri":"9:00-22:00","sat":"9:00-22:00","sun":"9:00-22:00"}'::jsonb,
  map_location jsonb NOT NULL DEFAULT '{"lat":9.03,"lng":38.74,"zoom":14}'::jsonb,
  payment_settings jsonb NOT NULL DEFAULT '{"telebir_qr":"","telebir_phone":"","bank_name":"","bank_account_name":"","bank_account_number":"","enable_telebir":true,"enable_bank":false,"enable_cash":true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON restaurant_settings;
CREATE POLICY "settings_select" ON restaurant_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "settings_insert" ON restaurant_settings;
CREATE POLICY "settings_insert" ON restaurant_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "settings_update" ON restaurant_settings;
CREATE POLICY "settings_update" ON restaurant_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "settings_delete" ON restaurant_settings;
CREATE POLICY "settings_delete" ON restaurant_settings FOR DELETE TO anon, authenticated USING (true);

-- Seed the singleton row
INSERT INTO restaurant_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ===== menu_categories =====
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select" ON menu_categories;
CREATE POLICY "categories_select" ON menu_categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "categories_insert" ON menu_categories;
CREATE POLICY "categories_insert" ON menu_categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "categories_update" ON menu_categories;
CREATE POLICY "categories_update" ON menu_categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "categories_delete" ON menu_categories;
CREATE POLICY "categories_delete" ON menu_categories FOR DELETE TO anon, authenticated USING (true);

-- ===== menu_items =====
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  discounted_price numeric,
  category_id uuid REFERENCES menu_categories(id) ON DELETE SET NULL,
  prep_time text NOT NULL DEFAULT '',
  calories text NOT NULL DEFAULT '',
  is_vegetarian boolean NOT NULL DEFAULT false,
  is_spicy boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  ingredients text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "items_select" ON menu_items;
CREATE POLICY "items_select" ON menu_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "items_insert" ON menu_items;
CREATE POLICY "items_insert" ON menu_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "items_update" ON menu_items;
CREATE POLICY "items_update" ON menu_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "items_delete" ON menu_items;
CREATE POLICY "items_delete" ON menu_items FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

-- ===== menu_item_options =====
CREATE TABLE IF NOT EXISTS menu_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  required boolean NOT NULL DEFAULT false,
  max_select integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE menu_item_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "options_select" ON menu_item_options;
CREATE POLICY "options_select" ON menu_item_options FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "options_insert" ON menu_item_options;
CREATE POLICY "options_insert" ON menu_item_options FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "options_update" ON menu_item_options;
CREATE POLICY "options_update" ON menu_item_options FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "options_delete" ON menu_item_options;
CREATE POLICY "options_delete" ON menu_item_options FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_menu_item_options_item_id ON menu_item_options(item_id);

-- ===== menu_item_option_values =====
CREATE TABLE IF NOT EXISTS menu_item_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id uuid NOT NULL REFERENCES menu_item_options(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE menu_item_option_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "option_values_select" ON menu_item_option_values;
CREATE POLICY "option_values_select" ON menu_item_option_values FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "option_values_insert" ON menu_item_option_values;
CREATE POLICY "option_values_insert" ON menu_item_option_values FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "option_values_update" ON menu_item_option_values;
CREATE POLICY "option_values_update" ON menu_item_option_values FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "option_values_delete" ON menu_item_option_values;
CREATE POLICY "option_values_delete" ON menu_item_option_values FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_menu_item_option_values_option_id ON menu_item_option_values(option_id);

-- ===== orders =====
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_address text NOT NULL DEFAULT '',
  order_type text NOT NULL DEFAULT 'delivery',
  table_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'cash',
  payment_status text NOT NULL DEFAULT 'unpaid',
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "orders_insert" ON orders;
CREATE POLICY "orders_insert" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_update" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "orders_delete" ON orders;
CREATE POLICY "orders_delete" ON orders FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ===== order_items =====
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  item_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  selected_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  line_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "order_items_update" ON order_items;
CREATE POLICY "order_items_update" ON order_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "order_items_delete" ON order_items;
CREATE POLICY "order_items_delete" ON order_items FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ===== updated_at trigger =====
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_settings_updated_at ON restaurant_settings;
CREATE TRIGGER trigger_settings_updated_at BEFORE UPDATE ON restaurant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
