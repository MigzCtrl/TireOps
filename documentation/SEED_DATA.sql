-- Tire Shop MVP Sample/Seed Data
-- Run this AFTER SCHEMA.sql and RLS_POLICIES.sql
-- This creates demo data for testing

-- ============================================================================
-- DEMO SHOP
-- ============================================================================

INSERT INTO shops (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Demo Tire Shop');

-- ============================================================================
-- USER PROFILES
-- ============================================================================

-- NOTE: You must first create users via Supabase Auth Dashboard or API
-- Then insert their profiles here using their user UUID
--
-- Example (replace with your actual user IDs):
-- INSERT INTO profiles (id, shop_id, full_name, role) VALUES
--   ('your-user-uuid-here', '11111111-1111-1111-1111-111111111111', 'John Owner', 'owner'),
--   ('staff-user-uuid', '11111111-1111-1111-1111-111111111111', 'Jane Staff', 'staff');

-- ============================================================================
-- SAMPLE CUSTOMERS
-- ============================================================================

INSERT INTO customers (shop_id, full_name, phone, email, notes) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Mike Johnson', '555-0101', 'mike@email.com', 'Preferred customer - always on time'),
  ('11111111-1111-1111-1111-111111111111', 'Sarah Williams', '555-0102', 'sarah@email.com', NULL),
  ('11111111-1111-1111-1111-111111111111', 'Bob Smith', '555-0103', NULL, 'Fleet account - 3 vehicles'),
  ('11111111-1111-1111-1111-111111111111', 'Jennifer Davis', '555-0104', 'jdavis@email.com', 'Prefers Michelin tires'),
  ('11111111-1111-1111-1111-111111111111', 'Carlos Rodriguez', '555-0105', 'carlos.r@email.com', NULL);

-- ============================================================================
-- SAMPLE VEHICLES
-- ============================================================================

INSERT INTO vehicles (shop_id, customer_id, year, make, model, trim, tire_size, plate, vin, notes)
SELECT
  '11111111-1111-1111-1111-111111111111',
  c.id,
  2020,
  'Toyota',
  'Camry',
  'SE',
  '215/55R17',
  'ABC1234',
  '1HGBH41JXMN109186',
  'Recent brake service'
FROM customers c WHERE c.phone = '555-0101';

INSERT INTO vehicles (shop_id, customer_id, year, make, model, trim, tire_size, plate, notes)
SELECT
  '11111111-1111-1111-1111-111111111111',
  c.id,
  2019,
  'Honda',
  'Accord',
  'EX',
  '225/50R17',
  'XYZ5678',
  NULL
FROM customers c WHERE c.phone = '555-0102';

INSERT INTO vehicles (shop_id, customer_id, year, make, model, tire_size, plate, notes)
SELECT
  '11111111-1111-1111-1111-111111111111',
  c.id,
  2018,
  'Ford',
  'F-150',
  '275/65R18',
  'TRK1001',
  'Work truck - heavy use'
FROM customers c WHERE c.phone = '555-0103';

INSERT INTO vehicles (shop_id, customer_id, year, make, model, tire_size, plate, notes)
SELECT
  '11111111-1111-1111-1111-111111111111',
  c.id,
  2017,
  'Chevrolet',
  'Silverado',
  '265/70R17',
  'TRK1002',
  'Fleet vehicle 2'
FROM customers c WHERE c.phone = '555-0103';

INSERT INTO vehicles (shop_id, customer_id, year, make, model, trim, tire_size, plate)
SELECT
  '11111111-1111-1111-1111-111111111111',
  c.id,
  2021,
  'Mazda',
  'CX-5',
  'Grand Touring',
  '225/55R19',
  'MAZ9876'
FROM customers c WHERE c.phone = '555-0104';

INSERT INTO vehicles (shop_id, customer_id, year, make, model, tire_size, plate)
SELECT
  '11111111-1111-1111-1111-111111111111',
  c.id,
  2022,
  'Tesla',
  'Model 3',
  '235/45R18',
  'EV12345'
FROM customers c WHERE c.phone = '555-0105';

-- ============================================================================
-- SAMPLE INVENTORY
-- ============================================================================

INSERT INTO inventory (shop_id, sku, brand, model, size, qty_on_hand, cost, price, supplier, location) VALUES
  -- 215/55R17 (Common sedan size)
  ('11111111-1111-1111-1111-111111111111', 'MIC-PS4-21555', 'Michelin', 'Pilot Sport 4', '215/55R17', 8, 120.00, 189.99, 'Tire Rack', 'A1'),
  ('11111111-1111-1111-1111-111111111111', 'BRI-QUI-21555', 'Bridgestone', 'Quiettrack', '215/55R17', 12, 95.00, 149.99, 'Tire Rack', 'B1'),
  ('11111111-1111-1111-1111-111111111111', 'CON-PC6-21555', 'Continental', 'PureContact 6', '215/55R17', 3, 110.00, 169.99, 'Discount Tire Direct', 'B2'),

  -- 225/50R17
  ('11111111-1111-1111-1111-111111111111', 'MIC-PS4-22550', 'Michelin', 'Pilot Sport 4', '225/50R17', 4, 130.00, 199.99, 'Tire Rack', 'A2'),
  ('11111111-1111-1111-1111-111111111111', 'GDY-AS3-22550', 'Goodyear', 'Assurance AS 3', '225/50R17', 6, 100.00, 159.99, 'Discount Tire Direct', 'C1'),

  -- 225/55R19 (CUV size)
  ('11111111-1111-1111-1111-111111111111', 'MIC-CR2-22555', 'Michelin', 'CrossClimate 2', '225/55R19', 10, 145.00, 229.99, 'Tire Rack', 'A3'),
  ('11111111-1111-1111-1111-111111111111', 'PIR-SC-22555', 'Pirelli', 'Scorpion Verde', '225/55R19', 7, 135.00, 209.99, 'Tire Rack', 'A4'),

  -- 235/45R18 (Performance)
  ('11111111-1111-1111-1111-111111111111', 'MIC-PS45-23545', 'Michelin', 'Pilot Sport 4S', '235/45R18', 5, 180.00, 279.99, 'Tire Rack', 'D1'),
  ('11111111-1111-1111-1111-111111111111', 'CON-SC6-23545', 'Continental', 'SportContact 6', '235/45R18', 2, 170.00, 269.99, 'Discount Tire Direct', 'D2'),

  -- Truck tires
  ('11111111-1111-1111-1111-111111111111', 'GDY-WRA-27565', 'Goodyear', 'Wrangler All-Terrain', '275/65R18', 8, 160.00, 249.99, 'Tire Rack', 'E1'),
  ('11111111-1111-1111-1111-111111111111', 'BFG-AT-26570', 'BFGoodrich', 'All-Terrain T/A KO2', '265/70R17', 6, 175.00, 269.99, 'Discount Tire Direct', 'E2'),
  ('11111111-1111-1111-1111-111111111111', 'MIC-LTX-26570', 'Michelin', 'LTX M/S2', '265/70R17', 4, 155.00, 239.99, 'Tire Rack', 'E3');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment these to verify data was inserted:

-- SELECT 'Shops' as table_name, COUNT(*) as count FROM shops
-- UNION ALL
-- SELECT 'Customers', COUNT(*) FROM customers
-- UNION ALL
-- SELECT 'Vehicles', COUNT(*) FROM vehicles
-- UNION ALL
-- SELECT 'Inventory', COUNT(*) FROM inventory;

-- View all customers with vehicle count:
-- SELECT
--   c.full_name,
--   c.phone,
--   c.email,
--   COUNT(v.id) as vehicle_count
-- FROM customers c
-- LEFT JOIN vehicles v ON v.customer_id = c.id
-- GROUP BY c.id, c.full_name, c.phone, c.email
-- ORDER BY c.full_name;

-- View inventory by size:
-- SELECT
--   size,
--   COUNT(*) as tire_models,
--   SUM(qty_on_hand) as total_tires
-- FROM inventory
-- GROUP BY size
-- ORDER BY size;
