-- Tire Shop MVP Database Schema
-- Run this in your Supabase SQL Editor

-- 1. CUSTOMERS TABLE
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. INVENTORY TABLE
CREATE TABLE public.inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT quantity_positive CHECK (quantity >= 0),
  CONSTRAINT price_positive CHECK (price >= 0)
);

-- 3. WORK ORDERS TABLE
CREATE TABLE public.work_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tire_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  service_type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  notes TEXT,
  total_amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

-- 4. INDEXES FOR PERFORMANCE
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_inventory_brand ON public.inventory(brand);
CREATE INDEX idx_inventory_size ON public.inventory(size);
CREATE INDEX idx_work_orders_customer_id ON public.work_orders(customer_id);
CREATE INDEX idx_work_orders_status ON public.work_orders(status);
CREATE INDEX idx_work_orders_scheduled_date ON public.work_orders(scheduled_date);

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES (Allow all operations for now - you can restrict later)
-- Customers policies
CREATE POLICY "Enable all operations for customers" ON public.customers
  FOR ALL USING (true) WITH CHECK (true);

-- Inventory policies
CREATE POLICY "Enable all operations for inventory" ON public.inventory
  FOR ALL USING (true) WITH CHECK (true);

-- Work orders policies
CREATE POLICY "Enable all operations for work_orders" ON public.work_orders
  FOR ALL USING (true) WITH CHECK (true);

-- 7. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. APPLY UPDATED_AT TRIGGERS
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 9. INSERT SAMPLE DATA (Optional - for testing)
INSERT INTO public.customers (name, email, phone, address) VALUES
  ('John Doe', 'john@example.com', '555-0101', '123 Main St'),
  ('Jane Smith', 'jane@example.com', '555-0102', '456 Oak Ave'),
  ('Bob Johnson', 'bob@example.com', '555-0103', '789 Pine Rd');

INSERT INTO public.inventory (brand, model, size, quantity, price, description) VALUES
  ('Michelin', 'Pilot Sport 4', '225/45R17', 24, 189.99, 'High-performance summer tire'),
  ('Goodyear', 'Eagle F1', '235/40R18', 16, 215.50, 'Ultra-high performance tire'),
  ('Bridgestone', 'Turanza', '205/55R16', 32, 145.00, 'All-season touring tire'),
  ('Continental', 'PureContact', '215/60R16', 20, 168.75, 'Grand touring all-season tire');

INSERT INTO public.work_orders (customer_id, tire_id, status, service_type, scheduled_date, notes, total_amount)
SELECT
  c.id,
  i.id,
  'pending',
  'Tire Installation',
  CURRENT_DATE + INTERVAL '3 days',
  'Customer requested alignment check',
  759.96
FROM public.customers c, public.inventory i
WHERE c.email = 'john@example.com' AND i.brand = 'Michelin'
LIMIT 1;
