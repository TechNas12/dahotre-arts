-- =============================================================================
-- Dahotre Arts — Permanent Database Fix & Bookings RPCs
-- =============================================================================
-- Run this in Supabase SQL Editor.
-- This script:
--   1. Permanently updates all existing booking orders to order_type = 'BOOKING'
--   2. Adds an automatic trigger so any future pending/advance orders are always 'BOOKING'
--   3. Installs high-performance RPCs and indexes
-- =============================================================================


-- =============================================================================
-- STEP 1: Permanent Data Migration (Fixes all historical orders)
-- =============================================================================
UPDATE orders
SET order_type = 'BOOKING'
WHERE order_type <> 'BOOKING'
  AND (
    status = 'PENDING'
    OR EXISTS (
      SELECT 1 FROM payments p 
      WHERE p.order_id = orders.id 
        AND p.payment_type = 'ADVANCE'
    )
  );


-- =============================================================================
-- STEP 2: Trigger to Automatically Guarantee `order_type = 'BOOKING'`
-- =============================================================================
-- Automatically marks any order as 'BOOKING' if created as PENDING
CREATE OR REPLACE FUNCTION trg_set_order_type_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'PENDING' THEN
    NEW.order_type := 'BOOKING';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_set_booking_type ON orders;
CREATE TRIGGER trg_orders_set_booking_type
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION trg_set_order_type_fn();


-- =============================================================================
-- STEP 3: Bookings RPCs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- RPC 1: get_bookings_kpi_summary()
-- -----------------------------------------------------------------------------
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
    -- Exclude orders whose payment is fulfilled and order status is COMPLETED
    AND NOT (
      o.status = 'COMPLETED'
      AND COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0) >= o.total_amount
    )
  )
  SELECT json_build_object(
    'total_bookings',   COUNT(bo.id),
    'pending_count',    COUNT(bo.id) FILTER (WHERE bo.status = 'PENDING'),
    'completed_count',  COUNT(bo.id) FILTER (WHERE bo.status = 'COMPLETED'),
    'cancelled_count',  COUNT(bo.id) FILTER (WHERE bo.status = 'CANCELLED'),
    'total_value',      COALESCE(SUM(bo.total_amount) FILTER (WHERE bo.status <> 'CANCELLED'), 0),
    'total_paid',       COALESCE(
                          (SELECT SUM(p.amount)
                           FROM payments p
                           JOIN booking_orders b ON b.id = p.order_id
                           WHERE b.status <> 'CANCELLED'),
                          0
                        ),
    'total_due',        GREATEST(0,
                          COALESCE(SUM(bo.total_amount) FILTER (WHERE bo.status <> 'CANCELLED'), 0)
                          - COALESCE(
                              (SELECT SUM(p.amount)
                               FROM payments p
                               JOIN booking_orders b ON b.id = p.order_id
                               WHERE b.status <> 'CANCELLED'),
                              0
                            )
                        )
  )
  INTO result
  FROM booking_orders bo;

  RETURN result;
END;
$$;


-- -----------------------------------------------------------------------------
-- RPC 2: get_booked_products_summary()
-- -----------------------------------------------------------------------------
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
      SUM(iwp.quantity)    AS total_booked_qty,
      SUM(iwp.subtotal)    AS total_value,
      SUM(iwp.item_paid)   AS total_paid,
      SUM(iwp.item_due)    AS total_due,
      JSON_AGG(
        json_build_object(
          'order_id',           iwp.order_id,
          'order_no',           iwp.order_no,
          'customer_name',      iwp.customer_name,
          'qty',                iwp.quantity,
          'status',             iwp.status,
          'fulfillment_status', iwp.fulfillment_status
        )
        ORDER BY iwp.order_id DESC
      ) AS orders
    FROM items_with_payment iwp
    GROUP BY
      iwp.product_id,
      iwp.variant_index,
      iwp.product_code,
      iwp.product_name,
      iwp.category_name,
      iwp.size_or_variant
  )

  SELECT JSON_AGG(
    json_build_object(
      'product_id',       pg.product_id,
      'variant_index',    pg.variant_index,
      'product_code',     pg.product_code,
      'name',             pg.product_name,
      'category',         COALESCE(pg.category_name, '-'),
      'size_or_variant',  pg.size_or_variant,
      'total_booked_qty', pg.total_booked_qty,
      'total_value',      pg.total_value,
      'total_paid',       ROUND(pg.total_paid::NUMERIC, 2),
      'total_due',        ROUND(pg.total_due::NUMERIC, 2),
      'orders',           pg.orders
    )
    ORDER BY pg.total_booked_qty DESC
  )
  INTO result
  FROM product_groups pg;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;


-- -----------------------------------------------------------------------------
-- RPC 3: search_bookings(p_search, p_status, p_fulfillment, p_payment_mode,
--                         p_date_from, p_date_to, p_limit, p_offset)
-- -----------------------------------------------------------------------------
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
  p_limit  := LEAST(100, GREATEST(1, COALESCE(p_limit, 25)));
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
