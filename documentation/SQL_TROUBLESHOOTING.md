# SQL Schema Troubleshooting Guide

If you're having issues running the schema in Supabase, try these solutions:

## ✅ Solution 1: Use the Fixed Version (RECOMMENDED)

Use `SCHEMA_FIXED.sql` instead of `SCHEMA.sql`. This version uses proper `$$` delimiters.

**File**: `D:\Tire-Shop-MVP\documentation\SCHEMA_FIXED.sql`

1. Open Supabase SQL Editor
2. Copy all contents from SCHEMA_FIXED.sql
3. Paste into SQL Editor
4. Click "Run"
5. Should see "Success. No rows returned"

---

## ✅ Solution 2: Run in Two Parts (IF FIXED VERSION FAILS)

Split the schema into two separate runs:

### Part 1: Tables (Run First)
**File**: `D:\Tire-Shop-MVP\documentation\SCHEMA_PART1_TABLES.sql`

1. Open Supabase SQL Editor
2. Copy all contents from SCHEMA_PART1_TABLES.sql
3. Paste and click "Run"
4. Wait for success message
5. Verify tables exist (check Tables in sidebar)

### Part 2: Functions (Run Second)
**File**: `D:\Tire-Shop-MVP\documentation\SCHEMA_PART2_FUNCTIONS.sql`

1. Open new query in SQL Editor
2. Copy all contents from SCHEMA_PART2_FUNCTIONS.sql
3. Paste and click "Run"
4. Wait for success message
5. Verify functions exist (check Functions in sidebar)

---

## ✅ Solution 3: Run Each Function Separately (LAST RESORT)

If both solutions above fail, run each function one at a time:

### Step 1: Run Tables
Copy and run SCHEMA_PART1_TABLES.sql

### Step 2: Run update_updated_at Function
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

### Step 3: Run Triggers
```sql
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER work_orders_updated_at BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Step 4: Run get_user_shop_id Function
```sql
CREATE OR REPLACE FUNCTION get_user_shop_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT shop_id FROM profiles WHERE id = auth.uid());
END;
$$;
```

### Step 5: Run is_owner Function
```sql
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT role = 'owner' FROM profiles WHERE id = auth.uid());
END;
$$;
```

### Step 6: Run create_work_order_with_lines Function
```sql
CREATE OR REPLACE FUNCTION create_work_order_with_lines(
  p_shop_id UUID,
  p_customer_id UUID,
  p_vehicle_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_notes TEXT,
  p_lines JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_work_order_id UUID;
  v_line JSONB;
  v_inventory_id UUID;
  v_current_qty INT;
  v_needed_qty INT;
  v_subtotal DECIMAL(10,2) := 0;
BEGIN
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    IF v_line->>'type' = 'tire' THEN
      v_inventory_id := (v_line->>'inventory_item_id')::UUID;
      v_needed_qty := (v_line->>'qty')::INT;

      SELECT qty_on_hand INTO v_current_qty
      FROM inventory
      WHERE id = v_inventory_id AND shop_id = p_shop_id
      FOR UPDATE;

      IF v_current_qty IS NULL THEN
        RAISE EXCEPTION 'Inventory item not found: %', v_inventory_id;
      END IF;

      IF v_current_qty < v_needed_qty THEN
        RAISE EXCEPTION 'Insufficient stock for item %. Available: %, Requested: %',
          v_inventory_id, v_current_qty, v_needed_qty;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO work_orders (shop_id, customer_id, vehicle_id, scheduled_at, notes)
  VALUES (p_shop_id, p_customer_id, p_vehicle_id, p_scheduled_at, p_notes)
  RETURNING id INTO v_work_order_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO work_order_lines (work_order_id, type, inventory_item_id, description, qty, unit_price)
    VALUES (
      v_work_order_id,
      v_line->>'type',
      (v_line->>'inventory_item_id')::UUID,
      v_line->>'description',
      (v_line->>'qty')::INT,
      (v_line->>'unit_price')::DECIMAL
    );

    v_subtotal := v_subtotal + ((v_line->>'qty')::INT * (v_line->>'unit_price')::DECIMAL);

    IF v_line->>'type' = 'tire' THEN
      UPDATE inventory
      SET qty_on_hand = qty_on_hand - (v_line->>'qty')::INT
      WHERE id = (v_line->>'inventory_item_id')::UUID;
    END IF;
  END LOOP;

  UPDATE work_orders
  SET subtotal = v_subtotal,
      tax = v_subtotal * 0.08,
      total = v_subtotal * 1.08
  WHERE id = v_work_order_id;

  RETURN v_work_order_id;
END;
$$;
```

---

## 🔍 Common Error Messages

### Error: "syntax error at or near $"
**Solution**: Use SCHEMA_FIXED.sql or run in parts

### Error: "relation already exists"
**Solution**: Tables already created, skip to Part 2 or RLS policies

### Error: "function already exists"
**Solution**: Script ran successfully, move to next step

### Error: "permission denied"
**Solution**: Make sure you're logged into Supabase and have project owner access

---

## ✅ How to Verify Success

After running the schema, verify everything is there:

### Check Tables (Should have 7)
1. Go to Table Editor in Supabase sidebar
2. You should see:
   - shops
   - profiles
   - customers
   - vehicles
   - inventory
   - work_orders
   - work_order_lines

### Check Functions (Should have 5)
1. Go to Database → Functions
2. You should see:
   - update_updated_at
   - get_user_shop_id
   - is_owner
   - create_work_order_with_lines
   - Plus any Supabase built-in functions

### Check Triggers (Should have 4)
1. In SQL Editor, run:
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

2. You should see:
   - customers_updated_at on customers
   - vehicles_updated_at on vehicles
   - inventory_updated_at on inventory
   - work_orders_updated_at on work_orders

---

## 🆘 Still Having Issues?

### Option 1: Start Fresh
1. Go to Settings → Database
2. Click "Reset Database" (⚠️ Warning: This deletes everything)
3. Try SCHEMA_FIXED.sql again

### Option 2: Manual Check
Copy this verification query and run it:

```sql
-- Check if all tables exist
SELECT
  'shops' as table_name,
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'shops')
    THEN '✓' ELSE '✗' END as exists
UNION ALL
SELECT 'profiles',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles')
    THEN '✓' ELSE '✗' END
UNION ALL
SELECT 'customers',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'customers')
    THEN '✓' ELSE '✗' END
UNION ALL
SELECT 'vehicles',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'vehicles')
    THEN '✓' ELSE '✗' END
UNION ALL
SELECT 'inventory',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'inventory')
    THEN '✓' ELSE '✗' END
UNION ALL
SELECT 'work_orders',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'work_orders')
    THEN '✓' ELSE '✗' END
UNION ALL
SELECT 'work_order_lines',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'work_order_lines')
    THEN '✓' ELSE '✗' END;
```

All should show ✓

---

## 📝 What Worked?

Once you get it working, please note which solution worked:
- [ ] SCHEMA_FIXED.sql (Solution 1)
- [ ] Two-part approach (Solution 2)
- [ ] Individual functions (Solution 3)

This will help if you need to set up another project later.

---

## ⏭️ Next Step

Once schema is successfully created:
1. Run RLS_POLICIES.sql
2. Optionally run SEED_DATA.sql
3. Continue with setup guide

**Need more help?** Check the main INSTALLATION.md or SETUP_GUIDE.md
