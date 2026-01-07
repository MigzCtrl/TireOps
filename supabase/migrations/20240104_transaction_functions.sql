-- ============================================
-- Transaction Support for Work Orders
-- ============================================

-- Function to complete a work order with atomic inventory deduction
-- This ensures all operations succeed or all fail together
CREATE OR REPLACE FUNCTION complete_work_order(
  p_work_order_id UUID,
  p_shop_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_item RECORD;
  v_current_qty INTEGER;
  v_result JSON;
BEGIN
  -- Get current order status
  SELECT status INTO v_current_status
  FROM work_orders
  WHERE id = p_work_order_id AND shop_id = p_shop_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Work order not found');
  END IF;

  -- Don't process if already completed
  IF v_current_status = 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Work order already completed');
  END IF;

  -- Update work order status
  UPDATE work_orders
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_work_order_id AND shop_id = p_shop_id;

  -- Deduct inventory for each work order item
  FOR v_item IN
    SELECT tire_id, quantity
    FROM work_order_items
    WHERE work_order_id = p_work_order_id
  LOOP
    -- Get current inventory quantity
    SELECT quantity INTO v_current_qty
    FROM inventory
    WHERE id = v_item.tire_id AND shop_id = p_shop_id;

    IF FOUND THEN
      -- Update inventory (prevent negative)
      UPDATE inventory
      SET quantity = GREATEST(0, v_current_qty - v_item.quantity),
          updated_at = NOW()
      WHERE id = v_item.tire_id AND shop_id = p_shop_id;
    END IF;
  END LOOP;

  RETURN json_build_object('success', true, 'message', 'Work order completed and inventory updated');
END;
$$;

-- Function to calculate work order total on the server side
CREATE OR REPLACE FUNCTION calculate_work_order_total(
  p_work_order_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO v_total
  FROM work_order_items
  WHERE work_order_id = p_work_order_id;

  RETURN v_total;
END;
$$;

-- Function to create work order with items in a single transaction
CREATE OR REPLACE FUNCTION create_work_order_with_items(
  p_shop_id UUID,
  p_customer_id UUID,
  p_service_type TEXT,
  p_scheduled_date DATE,
  p_scheduled_time TIME,
  p_notes TEXT,
  p_items JSON -- Array of {tire_id, quantity, unit_price}
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_work_order_id UUID;
  v_total NUMERIC := 0;
  v_item JSON;
  v_subtotal NUMERIC;
BEGIN
  -- Calculate total from items
  FOR v_item IN SELECT * FROM json_array_elements(p_items)
  LOOP
    v_subtotal := (v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::NUMERIC;
    v_total := v_total + v_subtotal;
  END LOOP;

  -- Create work order
  INSERT INTO work_orders (
    shop_id, customer_id, service_type, scheduled_date,
    scheduled_time, notes, status, total_amount
  )
  VALUES (
    p_shop_id, p_customer_id, p_service_type, p_scheduled_date,
    p_scheduled_time, p_notes, 'pending', v_total
  )
  RETURNING id INTO v_work_order_id;

  -- Create work order items
  FOR v_item IN SELECT * FROM json_array_elements(p_items)
  LOOP
    v_subtotal := (v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::NUMERIC;

    INSERT INTO work_order_items (
      work_order_id, tire_id, quantity, unit_price, subtotal
    )
    VALUES (
      v_work_order_id,
      (v_item->>'tire_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::NUMERIC,
      v_subtotal
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'work_order_id', v_work_order_id,
    'total_amount', v_total
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION complete_work_order(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_work_order_total(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_work_order_with_items(UUID, UUID, TEXT, DATE, TIME, TEXT, JSON) TO authenticated;
