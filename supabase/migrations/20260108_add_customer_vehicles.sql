-- Create customer_vehicles table for storing vehicle information
CREATE TABLE IF NOT EXISTS customer_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  trim VARCHAR(100),
  recommended_tire_size VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by customer
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_customer_id ON customer_vehicles(customer_id);

-- Enable RLS
ALTER TABLE customer_vehicles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_vehicles
-- Users can view vehicles for customers in their shop
CREATE POLICY "Users can view vehicles for their shop's customers" ON customer_vehicles
  FOR SELECT
  USING (
    customer_id IN (
      SELECT c.id FROM customers c
      JOIN profiles p ON p.shop_id = c.shop_id
      WHERE p.id = auth.uid()
    )
  );

-- Users can insert vehicles for customers in their shop
CREATE POLICY "Users can insert vehicles for their shop's customers" ON customer_vehicles
  FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT c.id FROM customers c
      JOIN profiles p ON p.shop_id = c.shop_id
      WHERE p.id = auth.uid()
    )
  );

-- Users can update vehicles for customers in their shop
CREATE POLICY "Users can update vehicles for their shop's customers" ON customer_vehicles
  FOR UPDATE
  USING (
    customer_id IN (
      SELECT c.id FROM customers c
      JOIN profiles p ON p.shop_id = c.shop_id
      WHERE p.id = auth.uid()
    )
  );

-- Users can delete vehicles for customers in their shop
CREATE POLICY "Users can delete vehicles for their shop's customers" ON customer_vehicles
  FOR DELETE
  USING (
    customer_id IN (
      SELECT c.id FROM customers c
      JOIN profiles p ON p.shop_id = c.shop_id
      WHERE p.id = auth.uid()
    )
  );

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_vehicles_updated_at
  BEFORE UPDATE ON customer_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_vehicles_updated_at();
