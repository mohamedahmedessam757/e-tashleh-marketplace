-- =====================================================================
-- Seed: طلب اختبار SLA لحظي — AWAITING_SELECTION
-- فاضل ~10 دقائق على selection_deadline_at ثم يُلغى (CANCELLED)
-- عبر enforce-expired-sla عند الصفر (أو cron خلال ~دقيقة إن لم تُفتح الصفحة)
--
-- Order: ORD-TEST-SLA-10MIN
-- شغّل في Supabase SQL Editor بعد نشر الـ backend/frontend الجديدين
-- إعادة التشغيل آمنة: يحذف نفس order_number ثم يعيد إنشاءه
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0) تنظيف تشغيل سابق
-- ---------------------------------------------------------------------
DO $cleanup$
DECLARE
  order_nums CONSTANT TEXT[] := ARRAY['ORD-TEST-SLA-10MIN'];
BEGIN
  UPDATE offers o
  SET cart_shipment_id = NULL,
      shipped_from_cart = false,
      shipped_from_cart_at = NULL
  FROM orders ord
  WHERE o.order_id = ord.id
    AND ord.order_number = ANY(order_nums);

  DELETE FROM wallet_transactions wt
  WHERE wt.payment_id IN (
    SELECT pt.id FROM payment_transactions pt
    JOIN orders ord ON ord.id = pt.order_id
    WHERE ord.order_number = ANY(order_nums)
  )
  OR wt.escrow_id IN (
    SELECT et.id FROM escrow_transactions et
    JOIN orders ord ON ord.id = et.order_id
    WHERE ord.order_number = ANY(order_nums)
  );

  DELETE FROM escrow_transactions et
  USING orders ord
  WHERE et.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM invoices inv
  USING orders ord
  WHERE inv.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM payment_transactions pt
  USING orders ord
  WHERE pt.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM shipment_status_logs ssl
  USING shipments sh, orders ord
  WHERE ssl.shipment_id = sh.id
    AND sh.order_id = ord.id
    AND ord.order_number = ANY(order_nums);

  DELETE FROM shipments sh
  USING orders ord
  WHERE sh.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM shipping_waybills sw
  USING orders ord
  WHERE sw.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM case_messages cm
  WHERE cm.case_id IN (
    SELECT r.id FROM returns r
    JOIN orders ord ON ord.id = r.order_id
    WHERE ord.order_number = ANY(order_nums)
  )
  OR cm.case_id IN (
    SELECT d.id FROM disputes d
    JOIN orders ord ON ord.id = d.order_id
    WHERE ord.order_number = ANY(order_nums)
  );

  DELETE FROM returns r
  USING orders ord
  WHERE r.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM disputes d
  USING orders ord
  WHERE d.order_id = ord.id AND ord.order_number = ANY(order_nums);

  UPDATE violations v
  SET order_id = NULL
  FROM orders ord
  WHERE v.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM verification_documents vd
  USING orders ord
  WHERE vd.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM verification_tasks vt
  USING orders ord
  WHERE vt.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM order_chat_messages ocm
  USING order_chats oc, orders ord
  WHERE ocm.chat_id = oc.id
    AND oc.order_id = ord.id
    AND ord.order_number = ANY(order_nums);

  DELETE FROM order_chats oc
  USING orders ord
  WHERE oc.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM order_shipping_addresses osa
  USING orders ord
  WHERE osa.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM reviews rev
  USING orders ord
  WHERE rev.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM audit_logs al
  USING orders ord
  WHERE al.order_id = ord.id AND ord.order_number = ANY(order_nums);

  UPDATE orders
  SET offer_id = NULL
  WHERE order_number = ANY(order_nums);

  DELETE FROM offer_rejections orej
  USING offers o, orders ord
  WHERE orej.offer_id = o.id
    AND o.order_id = ord.id
    AND ord.order_number = ANY(order_nums);

  DELETE FROM offers o
  USING orders ord
  WHERE o.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM order_parts op
  USING orders ord
  WHERE op.order_id = ord.id AND ord.order_number = ANY(order_nums);

  DELETE FROM orders
  WHERE order_number = ANY(order_nums);
END $cleanup$;

-- ---------------------------------------------------------------------
-- 1) حل العميل + متجر Merchant_Kit (نفس سياق البذور السابقة)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS seed_sla_10min_ctx;
CREATE TEMP TABLE seed_sla_10min_ctx (
  customer_id uuid NOT NULL,
  store_id uuid NOT NULL,
  customer_email text,
  store_name text,
  vendor_user_id uuid
);

DO $$
DECLARE
  v_customer_id uuid;
  v_customer_email text;
  v_customer_status text;
  v_store_id uuid;
  v_store_name text;
  v_store_status text;
  v_vendor_id uuid;
  detail text := '';
BEGIN
  SELECT u.id, u.email, u.status::text
  INTO v_customer_id, v_customer_email, v_customer_status
  FROM users u
  WHERE lower(u.email) = lower('masdweq346@gmail.com')
    AND upper(u.role::text) = 'CUSTOMER'
  ORDER BY CASE WHEN upper(u.status::text) = 'ACTIVE' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    SELECT u.id, u.email, u.status::text
    INTO v_customer_id, v_customer_email, v_customer_status
    FROM users u
    WHERE regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') LIKE '%576835475'
      AND upper(u.role::text) = 'CUSTOMER'
    ORDER BY CASE WHEN upper(u.status::text) = 'ACTIVE' THEN 0 ELSE 1 END
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    detail := detail || E'\n- عميل CUSTOMER غير موجود (masdweq346@gmail.com / +966576835475)';
  ELSIF upper(coalesce(v_customer_status, '')) <> 'ACTIVE' THEN
    detail := detail || format(
      E'\n- عميل %s موجود لكن status=%s (مطلوب ACTIVE)',
      coalesce(v_customer_email, 'masdweq346@gmail.com'),
      coalesce(v_customer_status, 'NULL')
    );
  END IF;

  SELECT s.id, s.name, s.status::text, s.owner_id
  INTO v_store_id, v_store_name, v_store_status, v_vendor_id
  FROM stores s
  JOIN users vu ON vu.id = s.owner_id
  WHERE lower(vu.email) = lower('joodelyad@gmail.com')
    AND upper(vu.role::text) = 'VENDOR'
  ORDER BY CASE WHEN upper(s.status::text) = 'ACTIVE' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_store_id IS NULL THEN
    SELECT s.id, s.name, s.status::text, s.owner_id
    INTO v_store_id, v_store_name, v_store_status, v_vendor_id
    FROM stores s
    WHERE lower(replace(replace(s.name, ' ', ''), '_', '')) IN ('merchantkit', 'mrechantkit')
       OR s.name ILIKE '%merchant%kit%'
    ORDER BY
      CASE WHEN lower(replace(replace(s.name, ' ', ''), '_', '')) = 'merchantkit' THEN 0 ELSE 1 END,
      CASE WHEN upper(s.status::text) = 'ACTIVE' THEN 0 ELSE 1 END
    LIMIT 1;
  END IF;

  IF v_store_id IS NULL THEN
    detail := detail || E'\n- متجر Merchant_Kit غير موجود (ولا متجر لمالك joodelyad@gmail.com)';
  ELSIF upper(coalesce(v_store_status, '')) <> 'ACTIVE' THEN
    detail := detail || format(
      E'\n- متجر %s موجود لكن status=%s (مطلوب ACTIVE)',
      coalesce(v_store_name, 'Merchant_Kit'),
      coalesce(v_store_status, 'NULL')
    );
  END IF;

  IF detail <> '' THEN
    RAISE EXCEPTION 'متطلبات السيد غير متوفرة:%', detail;
  END IF;

  INSERT INTO seed_sla_10min_ctx (customer_id, store_id, customer_email, store_name, vendor_user_id)
  VALUES (v_customer_id, v_store_id, v_customer_email, v_store_name, v_vendor_id);

  RAISE NOTICE 'Seed SLA-10MIN ctx: customer=% (%) store=% (%) vendor=% | deadline=NOW()+10min',
    v_customer_email, v_customer_id, v_store_name, v_store_id, v_vendor_id;
END $$;

-- =============================================================================
-- الطلب — مفرد | Toyota Camry 2020 | فلتر زيت
-- status=AWAITING_SELECTION | selection_deadline_at = NOW() + 10 minutes
-- =============================================================================
INSERT INTO orders (
  id, order_number, customer_id, store_id, status,
  vehicle_make, vehicle_model, vehicle_year, vin,
  part_name, part_description, part_images,
  condition_pref, warranty_preferred, request_type, shipping_type,
  reveal_offers_at, offers_stop_at, selection_deadline_at,
  created_at, updated_at
) VALUES (
  'a1111111-29a1-4111-8111-0000000000a1',
  'ORD-TEST-SLA-10MIN',
  (SELECT customer_id FROM seed_sla_10min_ctx),
  NULL,
  'AWAITING_SELECTION',
  'Toyota', 'Camry', 2020, 'VIN-TEST-SLA-10MIN-2026',
  'فلتر زيت',
  'طلب اختبار SLA لحظي — فاضل 10 دقائق على انتهاء مهلة الاختيار ثم CANCELLED.',
  '["https://yhasbbmieqcgyjktgyro.supabase.co/storage/v1/object/public/marketplace-uploads/order-draft/a901e830-dfcc-4aee-b331-694b433392bb/orders/parts/6o9pko9zf/1784997432707_th7b9a.PNG"]'::jsonb,
  'used', true, 'single', 'separate',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours 15 minutes',
  NOW() + INTERVAL '10 minutes',
  NOW() - INTERVAL '26 hours',
  NOW() - INTERVAL '2 hours'
);

INSERT INTO order_parts (id, order_id, name, description, notes, images, quantity, created_at, updated_at)
VALUES (
  'b1111111-29a1-4111-8111-0000000000a1',
  'a1111111-29a1-4111-8111-0000000000a1',
  'فلتر زيت',
  'فلتر زيت أصلي — Toyota Camry 2020',
  'اختبار عداد الاختيار 10 دقائق',
  ARRAY[
    'https://yhasbbmieqcgyjktgyro.supabase.co/storage/v1/object/public/marketplace-uploads/order-draft/a901e830-dfcc-4aee-b331-694b433392bb/orders/parts/6o9pko9zf/1784997432707_th7b9a.PNG'
  ]::text[],
  1,
  NOW() - INTERVAL '26 hours',
  NOW() - INTERVAL '26 hours'
);

INSERT INTO offers (
  id, offer_number, order_id, order_part_id, store_id,
  unit_price, weight_kg, shipping_cost, has_warranty, warranty_duration,
  delivery_days, condition, part_type, notes, offer_image, status, can_edit_until,
  is_withdrawn, created_at, updated_at
) VALUES (
  'c1111111-29a1-4111-8111-0000000001a1', 'OFR-TEST-SLA-10MIN-01',
  'a1111111-29a1-4111-8111-0000000000a1', 'b1111111-29a1-4111-8111-0000000000a1',
  (SELECT store_id FROM seed_sla_10min_ctx),
  80.00, 1.20, 20.00, true, '1month', 'd1_2', 'used_clean', 'standard',
  'عرض اختبار SLA — Merchant_kit — Toyota Camry',
  'https://yhasbbmieqcgyjktgyro.supabase.co/storage/v1/object/public/offer-attachments/0.026829251412919475.png',
  'pending',
  NOW() - INTERVAL '25 hours', false,
  NOW() - INTERVAL '25 hours',
  NOW() - INTERVAL '25 hours'
);

COMMIT;

-- تحقق سريع:
-- SELECT order_number, status, selection_deadline_at,
--        selection_deadline_at - NOW() AS remaining
-- FROM orders WHERE order_number = 'ORD-TEST-SLA-10MIN';
