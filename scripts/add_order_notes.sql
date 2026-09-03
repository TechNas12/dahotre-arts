-- =============================================================================
-- Dahotre Arts — Add notes column to orders table & update RPCs
-- =============================================================================
-- Run this script in your Supabase SQL Editor.
-- =============================================================================

BEGIN;

-- 1. Add notes column if it does not already exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

COMMIT;


-- =============================================================================
-- 2. Update create_order_atomic RPC to accept notes
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
  v_sale_type         TEXT;
  v_notes             TEXT;
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
  v_sale_type      := COALESCE(p->>'sale_type', 'RETAIL');
  v_notes          := NULLIF(TRIM(p->>'notes'), '');
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

  -- Insert order (with notes and sale_type)
  INSERT INTO orders (
    order_no,
    customer_id,
    user_id,
    order_date,
    status,
    fulfillment_status,
    discount,
    total_amount,
    order_type,
    sale_type,
    notes
  ) VALUES (
    v_order_no,
    v_customer_id,
    v_user_id,
    NOW(),
    v_status,
    CASE WHEN v_order_type = 'BOOKING' THEN 'UNFULFILLED' ELSE 'FULFILLED' END,
    v_discount,
    v_total_amount,
    v_order_type,
    v_sale_type,
    v_notes
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


-- =============================================================================
-- 3. Update search_bookings RPC to return notes
-- =============================================================================
CREATE OR REPLACE FUNCTION search_bookings(
  p_search        TEXT     DEFAULT NULL,
  p_status        TEXT     DEFAULT 'ALL',
  p_fulfillment   TEXT     DEFAULT 'ALL',
  p_payment_mode  TEXT     DEFAULT 'ALL',
  p_date_from     DATE     DEFAULT NULL,
  p_date_to       DATE     DEFAULT NULL,
  p_limit         INTEGER  DEFAULT 25,
  p_offset        INTEGER  DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result      JSON;
  total_count BIGINT;
  orders_json JSON;
BEGIN
  p_limit  := LEAST(10000, GREATEST(1, COALESCE(p_limit, 25)));
  p_offset := GREATEST(0, COALESCE(p_offset, 0));

  SELECT COUNT(DISTINCT o.id)
  INTO total_count
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  WHERE (
      o.order_type = 'BOOKING'
      OR o.status = 'PENDING'
      OR EXISTS (
        SELECT 1 FROM payments p 
        WHERE p.order_id = o.id AND p.payment_type = 'ADVANCE'
      )
    )
    AND NOT (
      o.status = 'COMPLETED'
      AND COALESCE((SELECT SUM(pay.amount) FROM payments pay WHERE pay.order_id = o.id), 0) >= o.total_amount
    )
    AND (p_status      = 'ALL' OR o.status            = p_status)
    AND (p_fulfillment = 'ALL' OR o.fulfillment_status = p_fulfillment)
    AND (p_date_from IS NULL   OR o.order_date::DATE  >= p_date_from)
    AND (p_date_to   IS NULL   OR o.order_date::DATE  <= p_date_to)
    AND (
      p_payment_mode = 'ALL'
      OR EXISTS (
        SELECT 1 FROM payments pay
        WHERE pay.order_id = o.id
          AND pay.payment_mode = p_payment_mode
      )
    )
    AND (
      p_search IS NULL
      OR p_search = ''
      OR o.order_no ILIKE '%' || p_search || '%'
      OR o.notes    ILIKE '%' || p_search || '%'
      OR c.name     ILIKE '%' || p_search || '%'
      OR c.phone    ILIKE '%' || p_search || '%'
    );

  SELECT JSON_AGG(row_data ORDER BY row_data->>'created_at' DESC)
  INTO orders_json
  FROM (
    SELECT json_build_object(
      'id',                o.id,
      'order_no',          o.order_no,
      'order_date',        o.order_date,
      'created_at',        o.created_at,
      'status',            o.status,
      'fulfillment_status',o.fulfillment_status,
      'total_amount',      o.total_amount,
      'discount',          o.discount,
      'notes',             o.notes,

      'customer', json_build_object(
        'id',      c.id,
        'name',    c.name,
        'phone',   c.phone,
        'email',   c.email,
        'address', c.address
      ),

      'user', json_build_object(
        'name', u.name
      ),

      'payments', COALESCE(
        (SELECT JSON_AGG(json_build_object(
          'id',           pay.id,
          'payment_mode', pay.payment_mode,
          'payment_type', pay.payment_type,
          'amount',       pay.amount,
          'payment_date', pay.payment_date
        ) ORDER BY pay.payment_date ASC)
         FROM payments pay
         WHERE pay.order_id = o.id),
        '[]'::JSON
      ),

      'items', COALESCE(
        (SELECT JSON_AGG(json_build_object(
          'id',            oi.id,
          'quantity',      oi.quantity,
          'selling_price', oi.selling_price,
          'subtotal',      oi.subtotal,
          'variant_index', oi.variant_index,
          'product', json_build_object(
            'id',           p.id,
            'product_code', p.product_code,
            'name',         p.name,
            'base',         p.base,
            'height',       p.height,
            'variants',     p.variants,
            'category',     json_build_object('name', cat.name)
          )
        ) ORDER BY oi.id ASC)
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         LEFT JOIN categories cat ON cat.id = p.category_id
         WHERE oi.order_id = o.id),
        '[]'::JSON
      )
    ) AS row_data
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN users u     ON u.id = o.user_id
    WHERE (
        o.order_type = 'BOOKING'
        OR o.status = 'PENDING'
        OR EXISTS (
          SELECT 1 FROM payments p 
          WHERE p.order_id = o.id AND p.payment_type = 'ADVANCE'
        )
      )
      AND NOT (
        o.status = 'COMPLETED'
        AND COALESCE((SELECT SUM(pay.amount) FROM payments pay WHERE pay.order_id = o.id), 0) >= o.total_amount
      )
      AND (p_status      = 'ALL' OR o.status            = p_status)
      AND (p_fulfillment = 'ALL' OR o.fulfillment_status = p_fulfillment)
      AND (p_date_from IS NULL   OR o.order_date::DATE  >= p_date_from)
      AND (p_date_to   IS NULL   OR o.order_date::DATE  <= p_date_to)
      AND (
        p_payment_mode = 'ALL'
        OR EXISTS (
          SELECT 1 FROM payments pay
          WHERE pay.order_id = o.id
            AND pay.payment_mode = p_payment_mode
        )
      )
      AND (
        p_search IS NULL
        OR p_search = ''
        OR o.order_no ILIKE '%' || p_search || '%'
        OR o.notes    ILIKE '%' || p_search || '%'
        OR c.name     ILIKE '%' || p_search || '%'
        OR c.phone    ILIKE '%' || p_search || '%'
      )
    ORDER BY o.created_at DESC
    LIMIT  p_limit
    OFFSET p_offset
  ) sub;

  result := json_build_object(
    'data',        COALESCE(orders_json, '[]'::JSON),
    'total_count', total_count
  );

  RETURN result;
END;
$$;
