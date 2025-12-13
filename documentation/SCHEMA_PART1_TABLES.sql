-- Tire Shop MVP - Part 1: Tables Only
-- Run this FIRST in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shops table
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, phone)
);

CREATE INDEX idx_customers_phone ON customers(shop_id, phone);
CREATE INDEX idx_customers_name ON customers(shop_id, LOWER(full_name));

-- Vehicles
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  year INT,
  make TEXT,
  model TEXT,
  trim TEXT,
  tire_size TEXT,
  plate TEXT,
  vin TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_customer ON vehicles(customer_id);

-- Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sku TEXT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  size TEXT NOT NULL,
  qty_on_hand INT NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  cost DECIMAL(10,2),
  price DECIMAL(10,2) NOT NULL,
  supplier TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_size ON inventory(shop_id, size);
CREATE INDEX idx_inventory_brand ON inventory(shop_id, brand);

-- Work Orders
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'done', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  notes TEXT,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_work_orders_date ON work_orders(shop_id, scheduled_at);
CREATE INDEX idx_work_orders_status ON work_orders(shop_id, status);
CREATE INDEX idx_work_orders_customer ON work_orders(customer_id);

-- Work Order Lines
CREATE TABLE work_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('tire', 'service')),
  inventory_item_id UUID REFERENCES inventory(id),
  description TEXT NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tire_requires_inventory CHECK (
    type != 'tire' OR inventory_item_id IS NOT NULL
  )
);

CREATE INDEX idx_work_order_lines_order ON work_order_lines(work_order_id);
