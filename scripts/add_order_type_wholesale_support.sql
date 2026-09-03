-- =============================================================================
-- Dahotre Arts — Order Type (Retail/Wholesale) & Exclude Wholesale from Bookings
-- =============================================================================
-- Run this script in the Supabase SQL Editor.
-- =============================================================================

BEGIN;

-- 1. Ensure `sale_type` column exists on `orders` table (default 'RETAIL')
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sale_type VARCHAR(20) DEFAULT 'RETAIL' NOT NULL;

-- 2. Backfill existing records with NULL or blank sale_type
UPDATE orders SET sale_type = 'RETAIL' WHERE sale_type IS NULL OR sale_type = '';

-- 3. Add check constraint to ensure only valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_orders_sale_type'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT check_orders_sale_type CHECK (sale_type IN ('RETAIL', 'WHOLESALE'));
  END IF;
END $$;

-- 4. Create index on sale_type for fast filtering
CREATE INDEX IF NOT EXISTS idx_orders_sale_type ON orders(sale_type);

COMMIT;


-- =============================================================================
-- 5. Update create_order_atomic RPC function
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
  v_sale_type      := COALESCE(NULLIF(TRIM(p->>'sale_type'), ''), 'RETAIL');
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

  -- Insert order (with sale_type and notes)
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
    'Created Order #' || v_order_no || ' (' || v_sale_type || ')'
  );

  -- Return created order info
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_no', v_order_no
  );
END;
$$;


-- =============================================================================
-- 6. Update get_bookings_kpi_summary() (EXCLUDES WHOLESALE)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_bookings_kpi_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  WITH booking_orders AS (
    SELECT o.id, o.status, o.total_amount
    FROM orders o
    WHERE (
       o.order_type = 'BOOKING'
       OR o.status = 'PENDING'
       OR EXISTS (
         SELECT 1 FROM payments p 
         WHERE p.order_id = o.id AND p.payment_type = 'ADVANCE'
       )
    )
    -- Wholesale orders MUST NOT show in bookings
    AND (o.sale_type IS NULL OR o.sale_type <> 'WHOLESALE')
    -- Exclude orders whose payment is fulfilled and order status is COMPLETED
    AND NOT (
      o.status = 'COMPLETED'
      AND COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0) >= o.total_amount
    )
  )
  SELECT json_build_object(
    'totalBookings',   COUNT(*),
    'pendingCount',    COUNT(*) FILTER (WHERE bo.status = 'PENDING'),
    'completedCount',  COUNT(*) FILTER (WHERE bo.status = 'COMPLETED'),
    'cancelledCount',  COUNT(*) FILTER (WHERE bo.status = 'CANCELLED'),
    'totalValue',      COALESCE(SUM(bo.total_amount), 0),
    'totalPaid',       COALESCE(
                         (SELECT SUM(p.amount) 
                          FROM payments p 
                          WHERE p.order_id IN (SELECT id FROM booking_orders WHERE status <> 'CANCELLED')), 
                         0
                       ),
    'totalDue',        GREATEST(
                         0,
                         COALESCE(SUM(bo.total_amount) FILTER (WHERE bo.status <> 'CANCELLED'), 0) -
                         COALESCE(
                           (SELECT SUM(p.amount) 
                            FROM payments p 
                            WHERE p.order_id IN (SELECT id FROM booking_orders WHERE status <> 'CANCELLED')),
                           0
                         )
                       )
  )
  INTO result
  FROM booking_orders bo;

  RETURN result;
END;
$$;


-- =============================================================================
-- 7. Update get_booked_products_summary() (EXCLUDES WHOLESALE)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_booked_products_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  WITH
  booking_items AS (
    SELECT
      o.id                          AS order_id,
      o.order_no,
      o.status,
      o.fulfillment_status,
      o.sale_type,
      c.name                        AS customer_name,
      oi.product_id,
      oi.variant_index,
      oi.quantity,
      oi.subtotal,
      p.product_code,
      p.name                        AS product_name,
      p.base,
      p.height,
      p.variants,
      cat.name                      AS category_name,
      SUM(oi.subtotal) OVER (PARTITION BY o.id)     AS order_total_value,
      COALESCE(
        (SELECT SUM(pay.amount) FROM payments pay WHERE pay.order_id = o.id),
        0
      )                                             AS order_paid
    FROM orders o
    JOIN order_items oi      ON oi.order_id    = o.id
    JOIN products p          ON p.id           = oi.product_id
    LEFT JOIN categories cat ON cat.id         = p.category_id
    LEFT JOIN customers c    ON c.id           = o.customer_id
    WHERE (
      o.order_type = 'BOOKING'
      OR o.status = 'PENDING'
      OR EXISTS (
        SELECT 1 FROM payments p 
        WHERE p.order_id = o.id AND p.payment_type = 'ADVANCE'
      )
    )
    -- Wholesale orders MUST NOT show in bookings
    AND (o.sale_type IS NULL OR o.sale_type <> 'WHOLESALE')
    AND o.status <> 'CANCELLED'
    -- Exclude orders whose payment is fulfilled and order status is COMPLETED
    AND NOT (
      o.status = 'COMPLETED'
      AND COALESCE((SELECT SUM(pay.amount) FROM payments pay WHERE pay.order_id = o.id), 0) >= o.total_amount
    )
  ),

  items_with_payment AS (
    SELECT
      bi.*,
      CASE
        WHEN bi.order_total_value > 0
          THEN bi.subtotal * LEAST(1.0, bi.order_paid / bi.order_total_value)
        ELSE 0
      END AS item_paid,
      CASE
        WHEN bi.order_total_value > 0
          THEN bi.subtotal - (bi.subtotal * LEAST(1.0, bi.order_paid / bi.order_total_value))
        ELSE bi.subtotal
      END AS item_due,
      CASE
        WHEN bi.variant_index IS NOT NULL
          AND bi.variants IS NOT NULL
          AND jsonb_array_length(bi.variants::jsonb) > bi.variant_index
          THEN (bi.variants::jsonb -> bi.variant_index ->> 'label')
        WHEN bi.height IS NOT NULL
          THEN CONCAT('H-', bi.height, CASE WHEN bi.base IS NOT NULL THEN CONCAT(' B-', bi.base) ELSE '' END)
        ELSE '-'
      END AS size_or_variant
    FROM booking_items bi
  ),

  product_groups AS (
    SELECT
      iwp.product_id,
      iwp.variant_index,
      iwp.product_code,
      iwp.product_name,
      iwp.category_name,
      iwp.size_or_variant,
      SUM(iwp.quantity)                                                      AS total_booked_qty,
      SUM(iwp.subtotal)                                                      AS total_booking_value,
      SUM(iwp.item_paid)                                                     AS total_paid_value,
      SUM(iwp.item_due)                                                      AS total_due_value,
      COUNT(DISTINCT iwp.order_id)                                           AS active_bookings_count,
      JSON_AGG(
        json_build_object(
          'order_id',           iwp.order_id,
          'order_no',           iwp.order_no,
          'customer_name',      iwp.customer_name,
          'status',             iwp.status,
          'fulfillment_status', iwp.fulfillment_status,
          'sale_type',          iwp.sale_type,
          'quantity',           iwp.quantity,
          'subtotal',           iwp.subtotal,
          'item_paid',          ROUND(iwp.item_paid, 2),
          'item_due',           ROUND(iwp.item_due, 2)
        )
        ORDER BY iwp.order_id DESC
      ) AS orders_detail
    FROM items_with_payment iwp
    GROUP BY
      iwp.product_id,
      iwp.variant_index,
      iwp.product_code,
      iwp.product_name,
      iwp.category_name,
      iwp.size_or_variant
  )

  SELECT COALESCE(
    JSON_AGG(
      json_build_object(
        'productId',           pg.product_id,
        'variantIndex',        pg.variant_index,
        'productCode',         pg.product_code,
        'name',                pg.product_name,
        'categoryName',        COALESCE(pg.category_name, 'Uncategorized'),
        'sizeOrVariant',       pg.size_or_variant,
        'totalBookedQty',      pg.total_booked_qty,
        'totalBookingValue',   pg.total_booking_value,
        'totalPaidValue',      ROUND(pg.total_paid_value, 2),
        'totalDueValue',       ROUND(pg.total_due_value, 2),
        'activeBookingsCount', pg.active_bookings_count,
        'orders',              pg.orders_detail
      )
      ORDER BY pg.total_booked_qty DESC, pg.product_code ASC
    ),
    '[]'::JSON
  )
  INTO result
  FROM product_groups pg;

  RETURN result;
END;
$$;


-- =============================================================================
-- 8. Update search_bookings(...) RPC function (EXCLUDES WHOLESALE)
-- =============================================================================
DROP FUNCTION IF EXISTS search_bookings(text, text, text, text, date, date, integer, integer);
DROP FUNCTION IF EXISTS search_bookings(text, text, text, text, text, date, date, integer, integer);

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
    -- Wholesale orders MUST NOT show in bookings
    AND (o.sale_type IS NULL OR o.sale_type <> 'WHOLESALE')
    -- Exclude orders whose payment is fulfilled and order status is COMPLETED
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
      'order_type',        o.order_type,
      'sale_type',         o.sale_type,
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
      -- Wholesale orders MUST NOT show in bookings
      AND (o.sale_type IS NULL OR o.sale_type <> 'WHOLESALE')
      -- Exclude orders whose payment is fulfilled and order status is COMPLETED
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
    ORDER BY o.order_date DESC, o.id DESC
    LIMIT p_limit
    OFFSET p_offset
  );

  result := json_build_object(
    'data',        COALESCE(orders_json, '[]'::JSON),
    'total_count', total_count
  );

  RETURN result;
END;
$$;
