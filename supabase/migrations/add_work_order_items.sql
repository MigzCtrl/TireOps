-- Create work_order_items table to support multiple tires per work order
CREATE TABLE IF NOT EXISTS work_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  tire_id UUID NOT NULL REFERENCES inventory(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX idx_work_order_items_work_order_id ON work_order_items(work_order_id);

-- Enable Row Level Security
ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth needs)
CREATE POLICY "Enable all operations for work_order_items" ON work_order_items
  FOR ALL USING (true) WITH CHECK (true);

-- Remove tire_id from work_orders table since it's now in work_order_items
-- But keep it as optional for backward compatibility
ALTER TABLE work_orders ALTER COLUMN tire_id DROP NOT NULL;

-- Add a comment
COMMENT ON TABLE work_order_items IS 'Stores individual tire items for each work order, allowing multiple tires per order';
