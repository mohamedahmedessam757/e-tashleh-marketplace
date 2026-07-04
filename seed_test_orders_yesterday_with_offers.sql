-- =====================================================================
-- Seed: 4 طلبات اختبار (أمس) — 2 فردي + 2 مجمّع (تجميع قطع)
-- شغّل في Supabase SQL Editor (دور postgres)
-- =====================================================================
-- السيناريو (نسبي لـ NOW() عند التشغيل — أعد تشغيل السكربت لتحديث التواريخ):
--   • أمس        → إنشاء الطلب (COLLECTING_OFFERS ثم جمع عروض)
--   • أمس 10–16  → عرض واحد لكل قطعة من التاجر
--   • اليوم      → AWAITING_SELECTION (reveal_offers_at ماضٍ، selection_deadline_at مستقبلي)
--
-- الحسابات (بعد تصفير النظام):
--   • عميل   masdweq346@gmail.com   a901e830-dfcc-4aee-b331-694b433392bb
--   • تاجر   joodelyad@gmail.com    306fd83e-0121-48cd-990f-655ba579e2d7
--
-- الطلبات (كلها للعميل أعلاه):
--   ORD-TEST-YDAY-001  فردي  | مستعمل
--   ORD-TEST-YDAY-002  فردي  | مستعمل
--   ORD-TEST-YDAY-003  مجمّع | 3 قطع | combined
--   ORD-TEST-YDAY-004  مجمّع | 3 قطع | combined
--
-- قيم العروض حسب النظام:
--   condition_pref (طلب): used | new
--   condition (عرض): new | used_clean
--   part_type: standard | engine | gearbox | bumper
--   warranty_duration: 15days | 1month | 3months | 12months
--   delivery_days: d1_3 | d3_5 | d5_7
--   request_type: single | multiple
--   shipping_type: separate | combined
--
-- إعادة التشغيل: يحذف المدفوعات/الضمان/الشحنات ثم الأربعة ثم يعيد إنشاءها
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0) تنظيف تشغيل سابق
-- ---------------------------------------------------------------------
DO $cleanup$
DECLARE
  order_nums CONSTANT TEXT[] := ARRAY[
    'ORD-TEST-YDAY-001',
    'ORD-TEST-YDAY-002',
    'ORD-TEST-YDAY-003',
    'ORD-TEST-YDAY-004'
  ];
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

  DELETE FROM orders
  WHERE order_number = ANY(order_nums);
END $cleanup$;

-- ---------------------------------------------------------------------
-- 1) تحقق: العميل + متجر التاجر (ACTIVE)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  missing TEXT := '';
  v_customer_id CONSTANT UUID := 'a901e830-dfcc-4aee-b331-694b433392bb';
  v_vendor_id   CONSTANT UUID := '306fd83e-0121-48cd-990f-655ba579e2d7';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = v_customer_id
      AND role = 'CUSTOMER'
      AND lower(email) = lower('masdweq346@gmail.com')
  ) THEN
    missing := missing || E'\n- عميل masdweq346@gmail.com (' || v_customer_id || ')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM stores s JOIN users u ON u.id = s.owner_id
    WHERE u.id = v_vendor_id
      AND u.role = 'VENDOR'
      AND lower(u.email) = lower('joodelyad@gmail.com')
      AND s.status = 'ACTIVE'
  ) THEN
    missing := missing || E'\n- تاجر joodelyad@gmail.com (' || v_vendor_id || ') — VENDOR + متجر ACTIVE';
  END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'متطلبات السيد غير متوفرة:%', missing;
  END IF;
END $$;

-- =============================================================================
-- الطلب 1 — فردي | مستعمل
-- =============================================================================
INSERT INTO orders (
  id, order_number, customer_id, store_id, status,
  vehicle_make, vehicle_model, vehicle_year, vin,
  part_name, part_description, part_images,
  condition_pref, warranty_preferred, request_type, shipping_type,
  reveal_offers_at, offers_stop_at, selection_deadline_at,
  created_at, updated_at
) VALUES (
  'c1111111-1111-4111-8111-111111111101',
  'ORD-TEST-YDAY-001',
  'a901e830-dfcc-4aee-b331-694b433392bb',
  NULL,
  'AWAITING_SELECTION',
  'Toyota', 'Camry', 2018, 'JTDBR32E180123456',
  'فحمات فرامل أمامية',
  'طلب اختبار فردي — قطعة واحدة مستعملة.',
  '[]'::jsonb,
  'used', true, 'single', 'separate',
  NOW() - INTERVAL '3 hours',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '16 hours',
  NOW() + INTERVAL '21 hours',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours',
  NOW() - INTERVAL '3 hours'
);

INSERT INTO order_parts (id, order_id, name, description, notes, images, quantity, created_at, updated_at)
VALUES (
  'd1111111-1111-4111-8111-111111111101',
  'c1111111-1111-4111-8111-111111111101',
  'فحمات فرامل أمامية',
  'زوج أمامي — Camry 2018',
  'يفضّل مستعمل بحالة جيدة',
  ARRAY[]::text[],
  1,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours'
);

INSERT INTO offers (
  id, offer_number, order_id, order_part_id, store_id,
  unit_price, weight_kg, shipping_cost, has_warranty, warranty_duration,
  delivery_days, condition, part_type, notes, status, can_edit_until,
  is_withdrawn, created_at, updated_at
) VALUES (
  'e1111111-1111-4111-8111-111111111101', 'OFR-TEST-YDAY-101',
  'c1111111-1111-4111-8111-111111111101', 'd1111111-1111-4111-8111-111111111101',
  (SELECT id FROM stores WHERE owner_id = '306fd83e-0121-48cd-990f-655ba579e2d7' AND status = 'ACTIVE' LIMIT 1),
  320.00, 3.50, 60.00, true, '3months', 'd3_5', 'used_clean', 'standard',
  'عرض مستعمل — فحمات فرامل أمامية', 'pending',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes', false,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes'
);

-- =============================================================================
-- الطلب 2 — فردي | مستعمل
-- =============================================================================
INSERT INTO orders (
  id, order_number, customer_id, store_id, status,
  vehicle_make, vehicle_model, vehicle_year, vin,
  part_name, part_description, part_images,
  condition_pref, warranty_preferred, request_type, shipping_type,
  reveal_offers_at, offers_stop_at, selection_deadline_at,
  created_at, updated_at
) VALUES (
  'c1111111-1111-4111-8111-111111111102',
  'ORD-TEST-YDAY-002',
  'a901e830-dfcc-4aee-b331-694b433392bb',
  NULL,
  'AWAITING_SELECTION',
  'Hyundai', 'Elantra', 2020, 'KMHD84LF1LU123789',
  'دينامو (مولد) كهرباء',
  'طلب اختبار فردي — Elantra 2020 — مستعمل.',
  '[]'::jsonb,
  'used', false, 'single', 'separate',
  NOW() - INTERVAL '2 hours 30 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '16 hours 30 minutes',
  NOW() + INTERVAL '21 hours 30 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 30 minutes',
  NOW() - INTERVAL '2 hours 30 minutes'
);

INSERT INTO order_parts (id, order_id, name, description, notes, images, quantity, created_at, updated_at)
VALUES (
  'd1111111-1111-4111-8111-111111111102',
  'c1111111-1111-4111-8111-111111111102',
  'دينامو (مولد) كهرباء',
  'مستعمل بحالة جيدة — Elantra 2020',
  'يفضّل فحص قبل الشحن',
  ARRAY[]::text[],
  1,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 30 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 30 minutes'
);

INSERT INTO offers (
  id, offer_number, order_id, order_part_id, store_id,
  unit_price, weight_kg, shipping_cost, has_warranty, warranty_duration,
  delivery_days, condition, part_type, notes, status, can_edit_until,
  is_withdrawn, created_at, updated_at
) VALUES (
  'e1111111-1111-4111-8111-111111111201', 'OFR-TEST-YDAY-201',
  'c1111111-1111-4111-8111-111111111102', 'd1111111-1111-4111-8111-111111111102',
  (SELECT id FROM stores WHERE owner_id = '306fd83e-0121-48cd-990f-655ba579e2d7' AND status = 'ACTIVE' LIMIT 1),
  680.00, 8.50, 90.00, true, '12months', 'd5_7', 'used_clean', 'standard',
  'دينامو مستعمل مفحوص', 'pending',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '11 hours 45 minutes', false,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '11 hours 30 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '11 hours 45 minutes'
);

-- =============================================================================
-- الطلب 3 — مجمّع (multiple + combined) | 3 قطع مستعملة
-- =============================================================================
INSERT INTO orders (
  id, order_number, customer_id, store_id, status,
  vehicle_make, vehicle_model, vehicle_year, vin,
  part_name, part_description, part_images,
  condition_pref, warranty_preferred, request_type, shipping_type,
  reveal_offers_at, offers_stop_at, selection_deadline_at,
  created_at, updated_at
) VALUES (
  'c1111111-1111-4111-8111-111111111103',
  'ORD-TEST-YDAY-003',
  'a901e830-dfcc-4aee-b331-694b433392bb',
  NULL,
  'AWAITING_SELECTION',
  'Toyota', 'Land Cruiser', 2012, 'JTMHV05J504123456',
  'طلب تجميع قطع مستعملة',
  'طلب مجمّع — 3 قطع مستعملة — شحن تجميعي (combined).',
  '[]'::jsonb,
  'used', true, 'multiple', 'combined',
  NOW() - INTERVAL '4 hours',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '15 hours 50 minutes',
  NOW() + INTERVAL '20 hours',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '9 hours',
  NOW() - INTERVAL '4 hours'
);

INSERT INTO order_parts (id, order_id, name, description, notes, images, quantity, created_at, updated_at)
VALUES
(
  'd1111111-1111-4111-8111-111111011301',
  'c1111111-1111-4111-8111-111111111103',
  'محرك (بلوك)',
  'بلوك محرك 4.0 V6 — Land Cruiser 2012',
  'يفضّل عداد أقل من 200 ألف',
  ARRAY[]::text[],
  1,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '9 hours',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '9 hours'
),
(
  'd1111111-1111-4111-8111-111111011302',
  'c1111111-1111-4111-8111-111111111103',
  'قير أوتوماتيك',
  'قير أوتوماتيك كامل — متوافق مع نفس الموديل',
  'يفضّل ضمان 3 أشهر على الأقل',
  ARRAY[]::text[],
  1,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '9 hours',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '9 hours'
),
(
  'd1111111-1111-4111-8111-111111011303',
  'c1111111-1111-4111-8111-111111111103',
  'دبل (دفرنس) خلفي',
  'دبل خلفي — حالة تشغيل جيدة',
  'مستعمل فقط',
  ARRAY[]::text[],
  1,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '9 hours',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '9 hours'
);

INSERT INTO offers (
  id, offer_number, order_id, order_part_id, store_id,
  unit_price, weight_kg, shipping_cost, has_warranty, warranty_duration,
  delivery_days, condition, part_type, cylinders, notes, status, can_edit_until,
  is_withdrawn, created_at, updated_at
) VALUES
(
  'e1111111-1111-4111-8111-111111011301', 'OFR-TEST-YDAY-301',
  'c1111111-1111-4111-8111-111111111103', 'd1111111-1111-4111-8111-111111011301',
  (SELECT id FROM stores WHERE owner_id = '306fd83e-0121-48cd-990f-655ba579e2d7' AND status = 'ACTIVE' LIMIT 1),
  12500.00, 180.00, 650.00, true, '3months', 'd5_7', 'used_clean', 'engine', 6,
  'محرك مستعمل V6', 'pending',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes', false,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes'
),
(
  'e1111111-1111-4111-8111-111111011304', 'OFR-TEST-YDAY-304',
  'c1111111-1111-4111-8111-111111111103', 'd1111111-1111-4111-8111-111111011302',
  (SELECT id FROM stores WHERE owner_id = '306fd83e-0121-48cd-990f-655ba579e2d7' AND status = 'ACTIVE' LIMIT 1),
  4200.00, 65.00, 350.00, true, '3months', 'd5_7', 'used_clean', 'gearbox', NULL,
  'قير أوتوماتيك مستعمل', 'pending',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 30 minutes', false,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 30 minutes'
),
(
  'e1111111-1111-4111-8111-111111011307', 'OFR-TEST-YDAY-307',
  'c1111111-1111-4111-8111-111111111103', 'd1111111-1111-4111-8111-111111011303',
  (SELECT id FROM stores WHERE owner_id = '306fd83e-0121-48cd-990f-655ba579e2d7' AND status = 'ACTIVE' LIMIT 1),
  2800.00, 45.00, 130.00, true, '1month', 'd3_5', 'used_clean', 'standard', NULL,
  'دبل خلفي مستعمل', 'pending',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '11 hours 30 minutes', false,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '11 hours 15 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '11 hours 30 minutes'
);

-- =============================================================================
-- الطلب 4 — مجمّع (multiple + combined) | 3 قطع مستعملة
-- =============================================================================
INSERT INTO orders (
  id, order_number, customer_id, store_id, status,
  vehicle_make, vehicle_model, vehicle_year, vin,
  part_name, part_description, part_images,
  condition_pref, warranty_preferred, request_type, shipping_type,
  reveal_offers_at, offers_stop_at, selection_deadline_at,
  created_at, updated_at
) VALUES (
  'c1111111-1111-4111-8111-111111111104',
  'ORD-TEST-YDAY-004',
  'a901e830-dfcc-4aee-b331-694b433392bb',
  NULL,
  'AWAITING_SELECTION',
  'Nissan', 'Patrol', 2014, 'JN1TBNT30Z0123456',
  'طلب تجميع قطع مستعملة',
  'طلب مجمّع — Patrol 2014 — 3 قطع مستعملة — شحن combined.',
  '[]'::jsonb,
  'used', false, 'multiple', 'combined',
  NOW() - INTERVAL '2 hours 15 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '16 hours 40 minutes',
  NOW() + INTERVAL '21 hours 45 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes',
  NOW() - INTERVAL '2 hours 15 minutes'
);

INSERT INTO order_parts (id, order_id, name, description, notes, images, quantity, created_at, updated_at)
VALUES
(
  'd1111111-1111-4111-8111-111111011401',
  'c1111111-1111-4111-8111-111111111104',
  'تيربو شاحن',
  'تيربو أصلي — Patrol 4.0 — مستعمل مفحوص',
  'مستعمل فقط',
  ARRAY[]::text[],
  1,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes'
),
(
  'd1111111-1111-4111-8111-111111011402',
  'c1111111-1111-4111-8111-111111111104',
  'كمبروسر مكيّف',
  'كمبروسر AC — حالة تشغيل جيدة',
  'يفضّل اختبار ضغط',
  ARRAY[]::text[],
  1,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes'
),
(
  'd1111111-1111-4111-8111-111111011403',
  'c1111111-1111-4111-8111-111111111104',
  'طرمبة بنزين',
  'طرمبة وقود — مستعملة أصلية',
  'لا يقبل قطعة جديدة',
  ARRAY[]::text[],
  1,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes'
);

INSERT INTO offers (
  id, offer_number, order_id, order_part_id, store_id,
  unit_price, weight_kg, shipping_cost, has_warranty, warranty_duration,
  delivery_days, condition, part_type, notes, status, can_edit_until,
  is_withdrawn, created_at, updated_at
) VALUES
(
  'e1111111-1111-4111-8111-111111011401', 'OFR-TEST-YDAY-401',
  'c1111111-1111-4111-8111-111111111104', 'd1111111-1111-4111-8111-111111011401',
  (SELECT id FROM stores WHERE owner_id = '306fd83e-0121-48cd-990f-655ba579e2d7' AND status = 'ACTIVE' LIMIT 1),
  1850.00, 12.00, 90.00, true, '3months', 'd3_5', 'used_clean', 'standard',
  'تيربو مستعمل', 'pending',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '11 hours', false,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 45 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '11 hours'
),
(
  'e1111111-1111-4111-8111-111111011404', 'OFR-TEST-YDAY-404',
  'c1111111-1111-4111-8111-111111111104', 'd1111111-1111-4111-8111-111111011402',
  (SELECT id FROM stores WHERE owner_id = '306fd83e-0121-48cd-990f-655ba579e2d7' AND status = 'ACTIVE' LIMIT 1),
  980.00, 8.00, 60.00, true, '1month', 'd1_3', 'used_clean', 'standard',
  'كمبروسر مكيّف مستعمل', 'pending',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '11 hours 15 minutes', false,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '11 hours',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '11 hours 15 minutes'
),
(
  'e1111111-1111-4111-8111-111111011407', 'OFR-TEST-YDAY-407',
  'c1111111-1111-4111-8111-111111111104', 'd1111111-1111-4111-8111-111111011403',
  (SELECT id FROM stores WHERE owner_id = '306fd83e-0121-48cd-990f-655ba579e2d7' AND status = 'ACTIVE' LIMIT 1),
  650.00, 3.50, 60.00, false, NULL, 'd1_3', 'used_clean', 'standard',
  'طرمبة بنزين مستعملة', 'pending',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '12 hours', false,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '11 hours 45 minutes',
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '12 hours'
);

-- ---------------------------------------------------------------------
-- سجل تدقيق
-- ---------------------------------------------------------------------
INSERT INTO audit_logs (
  order_id, action, entity, actor_type, actor_id, actor_name,
  previous_state, new_state, reason, metadata, timestamp
) VALUES
(
  'c1111111-1111-4111-8111-111111111101',
  'CREATE', 'Order', 'CUSTOMER', 'a901e830-dfcc-4aee-b331-694b433392bb', 'Mohamed_Essam',
  NULL, 'COLLECTING_OFFERS', 'Seed: طلب فردي مستعمل',
  '{"requestType":"single","shippingType":"separate","partsCount":1,"conditionPref":"used"}'::jsonb,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours'
),
(
  'c1111111-1111-4111-8111-111111111101',
  'STATUS_CHANGE', 'Order', 'SYSTEM', 'system-scheduler', 'System Scheduler',
  'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'Seed: انتهت مهلة الكشف',
  '{"offersCount":1}'::jsonb,
  NOW() - INTERVAL '3 hours'
),
(
  'c1111111-1111-4111-8111-111111111102',
  'CREATE', 'Order', 'CUSTOMER', 'a901e830-dfcc-4aee-b331-694b433392bb', 'Mohamed_Essam',
  NULL, 'COLLECTING_OFFERS', 'Seed: طلب فردي مستعمل',
  '{"requestType":"single","shippingType":"separate","partsCount":1,"conditionPref":"used"}'::jsonb,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 30 minutes'
),
(
  'c1111111-1111-4111-8111-111111111102',
  'STATUS_CHANGE', 'Order', 'SYSTEM', 'system-scheduler', 'System Scheduler',
  'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'Seed: انتهت مهلة الكشف',
  '{"offersCount":1}'::jsonb,
  NOW() - INTERVAL '2 hours 30 minutes'
),
(
  'c1111111-1111-4111-8111-111111111103',
  'CREATE', 'Order', 'CUSTOMER', 'a901e830-dfcc-4aee-b331-694b433392bb', 'Mohamed_Essam',
  NULL, 'COLLECTING_OFFERS', 'Seed: طلب مجمّع مستعمل',
  '{"requestType":"multiple","shippingType":"combined","partsCount":3,"conditionPref":"used"}'::jsonb,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '9 hours'
),
(
  'c1111111-1111-4111-8111-111111111103',
  'STATUS_CHANGE', 'Order', 'SYSTEM', 'system-scheduler', 'System Scheduler',
  'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'Seed: انتهت مهلة الكشف — طلب مجمّع',
  '{"offersCount":3,"partsCount":3}'::jsonb,
  NOW() - INTERVAL '4 hours'
),
(
  'c1111111-1111-4111-8111-111111111104',
  'CREATE', 'Order', 'CUSTOMER', 'a901e830-dfcc-4aee-b331-694b433392bb', 'Mohamed_Essam',
  NULL, 'COLLECTING_OFFERS', 'Seed: طلب مجمّع مستعمل',
  '{"requestType":"multiple","shippingType":"combined","partsCount":3,"conditionPref":"used"}'::jsonb,
  (date_trunc('day', NOW()) - INTERVAL '1 day') + INTERVAL '10 hours 15 minutes'
),
(
  'c1111111-1111-4111-8111-111111111104',
  'STATUS_CHANGE', 'Order', 'SYSTEM', 'system-scheduler', 'System Scheduler',
  'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'Seed: انتهت مهلة الكشف — طلب مجمّع',
  '{"offersCount":3,"partsCount":3}'::jsonb,
  NOW() - INTERVAL '2 hours 15 minutes'
);

COMMIT;

-- ---------------------------------------------------------------------
-- ملخص بعد التشغيل
-- ---------------------------------------------------------------------
SELECT
  o.order_number,
  o.status,
  u.email AS customer_email,
  u.name AS customer_name,
  o.request_type,
  o.shipping_type,
  o.condition_pref,
  (SELECT COUNT(*) FROM order_parts p WHERE p.order_id = o.id) AS parts_count,
  (SELECT COUNT(*) FROM offers f WHERE f.order_id = o.id) AS offers_count,
  o.created_at,
  o.reveal_offers_at,
  o.selection_deadline_at
FROM orders o
JOIN users u ON u.id = o.customer_id
WHERE o.order_number LIKE 'ORD-TEST-YDAY-%'
ORDER BY o.order_number;

SELECT
  o.order_number,
  op.name AS part_name,
  off.offer_number,
  s.name AS store_name,
  u.email AS vendor_email,
  off.unit_price,
  off.condition,
  off.part_type,
  off.warranty_duration,
  off.delivery_days,
  off.status
FROM offers off
JOIN orders o ON o.id = off.order_id
JOIN order_parts op ON op.id = off.order_part_id
JOIN stores s ON s.id = off.store_id
JOIN users u ON u.id = s.owner_id
WHERE o.order_number LIKE 'ORD-TEST-YDAY-%'
ORDER BY o.order_number, op.name, off.created_at;
