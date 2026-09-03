-- =============================================================================
-- Migration: Update search_bookings RPC to remove 100-record clamp
-- Allows fetching up to 10,000 records per call if needed.
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
    'total_count', COALESCE(total_count, 0),
    'data',        COALESCE(orders_json, '[]'::JSON)
  );

  RETURN result;
END;
$$;
