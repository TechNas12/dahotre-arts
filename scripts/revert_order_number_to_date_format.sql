-- =============================================================================
-- Dahotre Arts — Revert Order Numbers back to Date-Based Format (ORD-YYYYMMDD-NNN)
-- =============================================================================
-- Run this in your Supabase SQL Editor.
-- =============================================================================

BEGIN;

-- 0. Expand column types to prevent any "value too long" errors
ALTER TABLE orders ALTER COLUMN fulfillment_status TYPE VARCHAR(50);
ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(50);
ALTER TABLE orders ALTER COLUMN order_type TYPE VARCHAR(50);
ALTER TABLE orders ALTER COLUMN order_no TYPE VARCHAR(50);
ALTER TABLE customers ALTER COLUMN phone TYPE VARCHAR(50);
ALTER TABLE customers ALTER COLUMN name TYPE VARCHAR(255);
ALTER TABLE payments ALTER COLUMN payment_mode TYPE VARCHAR(50);
ALTER TABLE payments ALTER COLUMN payment_type TYPE VARCHAR(50);

-- 1. Restore all existing orders back to daily date-prefixed format (ORD-YYYYMMDD-001, ...)
WITH daily_numbered AS (
  SELECT 
    id,
    'ORD-' || to_char(COALESCE(order_date, created_at, NOW()), 'YYYYMMDD') || '-' || 
    LPAD(ROW_NUMBER() OVER (
      PARTITION BY to_char(COALESCE(order_date, created_at, NOW()), 'YYYYMMDD') 
      ORDER BY COALESCE(order_date, created_at, NOW()) ASC, id ASC
    )::TEXT, 3, '0') AS restored_order_no
  FROM orders
)
UPDATE orders o
SET order_no = d.restored_order_no
FROM daily_numbered d
WHERE o.id = d.id;

-- 2. Drop the sequential sequence if created
DROP SEQUENCE IF EXISTS order_no_seq;

COMMIT;


-- =============================================================================
-- 3. Restore create_order_atomic RPC to Date-Based Format
-- =============================================================================
DROP FUNCTION IF EXISTS create_order_atomic(jsonb) CASCADE;
DROP FUNCTION IF EXISTS create_order_atomic(json) CASCADE;

CREATE OR REPLACE FUNCTION create_order_atomic(p JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id           BIGINT;
  v_customer_id       BIGINT;
  v_new_cust_name     TEXT;
  v_new_cust_phone    TEXT;
  v_new_cust_email    TEXT;
  v_order_type        TEXT;
  v_discount          NUMERIC;
  v_total_amount      NUMERIC;
  v_payment_mode      TEXT;
  v_payment_type      TEXT;
  v_payment_amount    NUMERIC;
  v_items             JSONB;
  
  v_order_id          BIGINT;
  v_order_no          TEXT;
  v_date_str          TEXT;
  v_prefix            TEXT;
  v_last_order_no     TEXT;
  v_seq               INT;
  
  v_item_elem         JSONB;
  v_prod_id           BIGINT;
  v_variant_idx       INT;
  v_qty               INT;
  v_selling_price     NUMERIC;
  v_subtotal          NUMERIC;
  v_status            TEXT;
BEGIN
  -- Extract parameters
  v_user_id        := (p->>'user_id')::BIGINT;
  v_customer_id    := (p->>'customer_id')::BIGINT;
  v_new_cust_name  := p->>'new_customer_name';
  v_new_cust_phone := p->>'new_customer_phone';
  v_new_cust_email := p->>'new_customer_email';
  v_order_type     := COALESCE(p->>'order_type', 'PURCHASE');
  v_discount       := COALESCE((p->>'discount')::NUMERIC, 0);
  v_total_amount   := COALESCE((p->>'total_amount')::NUMERIC, 0);
  v_payment_mode   := COALESCE(p->>'payment_mode', 'CASH');
  v_payment_type   := COALESCE(p->>'payment_type', 'FULL');
  v_payment_amount := COALESCE((p->>'payment_amount')::NUMERIC, 0);
  v_items          := p->'items';

  -- Create new customer if customer_id is null and name is provided
  IF v_customer_id IS NULL AND v_new_cust_name IS NOT NULL AND TRIM(v_new_cust_name) <> '' THEN
    INSERT INTO customers (name, phone, email)
    VALUES (TRIM(v_new_cust_name), TRIM(v_new_cust_phone), TRIM(v_new_cust_email))
    RETURNING id INTO v_customer_id;
  END IF;

  -- Generate order_no: ORD-YYYYMMDD-NNN
  v_date_str := to_char(NOW(), 'YYYYMMDD');
  v_prefix   := 'ORD-' || v_date_str || '-';

  SELECT order_no INTO v_last_order_no
  FROM orders
  WHERE order_no LIKE v_prefix || '%'
  ORDER BY order_no DESC
  LIMIT 1;

  IF v_last_order_no IS NOT NULL THEN
    v_seq := (SUBSTRING(v_last_order_no FROM 14 FOR 3))::INT + 1;
    v_order_no := v_prefix || LPAD(v_seq::TEXT, 3, '0');
  ELSE
    v_order_no := v_prefix || '001';
  END IF;

  -- Determine initial status
  IF v_order_type = 'BOOKING' THEN
    v_status := 'PENDING';
  ELSE
    v_status := 'COMPLETED';
  END IF;

  -- Insert order
  INSERT INTO orders (
    order_no,
    customer_id,
    user_id,
    order_date,
    status,
    fulfillment_status,
    discount,
    total_amount,
    order_type
  ) VALUES (
    v_order_no,
    v_customer_id,
    v_user_id,
    NOW(),
    v_status,
    CASE WHEN v_order_type = 'BOOKING' THEN 'UNFULFILLED' ELSE 'FULFILLED' END,
    v_discount,
    v_total_amount,
    v_order_type
  )
  RETURNING id INTO v_order_id;

  -- Insert order items & deduct stock
  IF v_items IS NOT NULL AND jsonb_array_length(v_items) > 0 THEN
    FOR v_item_elem IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      v_prod_id       := (v_item_elem->>'product_id')::BIGINT;
      v_variant_idx   := (v_item_elem->>'variant_index')::INT;
      v_qty           := COALESCE((v_item_elem->>'quantity')::INT, 1);
      v_selling_price := COALESCE((v_item_elem->>'selling_price')::NUMERIC, 0);
      v_subtotal      := v_qty * v_selling_price;

      INSERT INTO order_items (
        order_id,
        product_id,
        variant_index,
        quantity,
        selling_price,
        subtotal
      ) VALUES (
        v_order_id,
        v_prod_id,
        v_variant_idx,
        v_qty,
        v_selling_price,
        v_subtotal
      );

      -- Deduct stock from product
      UPDATE products
      SET stock_qty = GREATEST(0, stock_qty - v_qty)
      WHERE id = v_prod_id;
    END LOOP;
  END IF;

  -- Insert payment transaction if amount > 0
  IF v_payment_amount > 0 THEN
    INSERT INTO payments (
      order_id,
      amount,
      payment_mode,
      payment_type,
      payment_date
    ) VALUES (
      v_order_id,
      v_payment_amount,
      v_payment_mode,
      v_payment_type,
      NOW()
    );
  END IF;

  -- Log Activity
  INSERT INTO activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_user_id,
    'ORDER_CREATED',
    'order',
    v_order_id::TEXT,
    'Created Order #' || v_order_no
  );

  -- Return created order info
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_no', v_order_no
  );
END;
$$;
