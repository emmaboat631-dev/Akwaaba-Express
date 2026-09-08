-- Seed realistic demo data for presentation.
-- Only runs when fewer than 5 bookings exist (prevents double-seeding).

DO $$
DECLARE
  _uid  uuid;
  _uids uuid[] := '{}';
  _dids uuid[] := '{}';
  _trip record;
  _i    int;
  _amt  numeric;
  _ts   timestamptz;
  _seat text;
  _names text[] := ARRAY[
    'Kwame Asante','Ama Mensah','Kofi Owusu','Abena Boateng','Yaw Darko',
    'Akua Ofori','Kwesi Adjei','Efua Appiah','Kojo Antwi','Adwoa Gyamfi',
    'Nana Agyemang','Akosua Frimpong','Kwabena Opoku','Afia Osei','Yaa Sarpong',
    'Nii Armah','Naa Ayeley','Kofi Manu','Esi Bonsu','Papa Yeboah'
  ];
  _phones text[] := ARRAY[
    '244000001','244000002','244000003','244000004','244000005',
    '244000006','244000007','244000008','244000009','244000010',
    '244000011','244000012','244000013','244000014','244000015',
    '244000016','244000017','244000018','244000019','244000020'
  ];
  _colors text[] := ARRAY[
    '#06392F','#274F9E','#B5544A','#1F6B44','#B9822B',
    '#5B3BA8','#CE1126','#3B82F6','#9333EA','#F4A23B'
  ];
  _booking_id uuid;
BEGIN
  -- Guard: skip if data already exists
  IF (SELECT count(*) FROM public.bookings) >= 5 THEN
    RAISE NOTICE 'Demo data already present — skipping seed.';
    RETURN;
  END IF;

  ---------------------------------------------------------------
  -- 1. Create 15 passenger users + 5 driver users in auth.users
  ---------------------------------------------------------------
  FOR _i IN 1..20 LOOP
    _uid := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      is_sso_user, confirmation_token, recovery_token, email_change_token_new
    ) VALUES (
      _uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'demo' || _i || '@akwaaba.test',
      crypt('DemoPass123!', gen_salt('bf')),
      now() - interval '30 days' + (_i * interval '1 day'),
      now() - interval '30 days' + (_i * interval '1 day'),
      now(),
      jsonb_build_object('name', _names[_i], 'phone', _phones[_i]),
      '{"provider":"email","providers":["email"]}'::jsonb,
      false, '', '', ''
    );

    -- Also insert identity row so Supabase doesn't complain
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(), _uid,
      jsonb_build_object('sub', _uid::text, 'email', 'demo' || _i || '@akwaaba.test'),
      'email', _uid::text,
      now(), now(), now()
    );

    IF _i <= 15 THEN
      -- Passenger profile (upsert — trigger may have already created the row)
      INSERT INTO public.profiles (id, role, name, phone, email, is_guest, avatar_color)
      VALUES (
        _uid, 'passenger', _names[_i], _phones[_i],
        'demo' || _i || '@akwaaba.test', false,
        _colors[1 + ((_i - 1) % 10)]
      )
      ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role, name = EXCLUDED.name, phone = EXCLUDED.phone,
        email = EXCLUDED.email, avatar_color = EXCLUDED.avatar_color;
      _uids := array_append(_uids, _uid);
    ELSE
      -- Driver profile (upsert)
      INSERT INTO public.profiles (
        id, role, name, phone, email, is_guest, avatar_color,
        license_no, vehicle_plate, vehicle_model, vehicle_color,
        operator_id, bus_type_id, verification_status
      ) VALUES (
        _uid, 'driver', _names[_i], _phones[_i],
        'demo' || _i || '@akwaaba.test', false,
        _colors[1 + ((_i - 1) % 10)],
        'GDL-' || lpad((_i * 1000 + 500)::text, 7, '0'),
        'GR-' || (1000 + _i * 100) || '-' || (20 + _i),
        CASE (_i % 3) WHEN 0 THEN 'Yutong ZK6116' WHEN 1 THEN 'Golden Dragon XML6127' ELSE 'Neoplan N516' END,
        CASE (_i % 4) WHEN 0 THEN 'White' WHEN 1 THEN 'Blue' WHEN 2 THEN 'Red' ELSE 'Silver' END,
        CASE (_i % 5) WHEN 1 THEN 'stc' WHEN 2 THEN 'vip' WHEN 3 THEN 'oa' WHEN 4 THEN 'metro' ELSE 'aaba' END,
        CASE (_i % 3) WHEN 0 THEN 'vip' WHEN 1 THEN 'standard' ELSE 'mini' END,
        CASE WHEN _i <= 18 THEN 'verified' ELSE 'pending' END
      )
      ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role, name = EXCLUDED.name, phone = EXCLUDED.phone,
        email = EXCLUDED.email, avatar_color = EXCLUDED.avatar_color,
        license_no = EXCLUDED.license_no, vehicle_plate = EXCLUDED.vehicle_plate,
        vehicle_model = EXCLUDED.vehicle_model, vehicle_color = EXCLUDED.vehicle_color,
        operator_id = EXCLUDED.operator_id, bus_type_id = EXCLUDED.bus_type_id,
        verification_status = EXCLUDED.verification_status;
      _dids := array_append(_dids, _uid);
    END IF;
  END LOOP;

  ---------------------------------------------------------------
  -- 2. Ensure today's trips exist (for "Today's Schedule")
  ---------------------------------------------------------------
  -- Add 6 trips for today if none exist
  IF (SELECT count(*) FROM public.trips WHERE travel_date = CURRENT_DATE) = 0 THEN
    INSERT INTO public.trips (from_id, to_id, travel_date, operator_id, bus_type_id, plate, depart_mins, arrive_mins, duration_mins, distance_km, price, seats_total, status, driver_id)
    VALUES
      ('accra','kumasi', CURRENT_DATE,'stc','vip','GR-1234-22', 360,660,300,250,85,33,'active', _dids[1]),
      ('accra','tamale', CURRENT_DATE,'vip','vip','GR-5678-21', 420,960,540,600,150,33,'active', _dids[2]),
      ('kumasi','takoradi',CURRENT_DATE,'oa','standard','GR-9012-20', 480,720,240,220,55,44,'active', _dids[3]),
      ('accra','capecoast',CURRENT_DATE,'metro','standard','GR-3456-23', 540,720,180,150,42,44,'active', _dids[1]),
      ('tamale','bolgatanga',CURRENT_DATE,'aaba','mini','GR-7890-24', 600,780,180,160,35,18,'active', _dids[2]),
      ('kumasi','sunyani',CURRENT_DATE,'stc','standard','GR-2345-22', 720,900,180,130,38,44,'active', _dids[3]);
  END IF;

  ---------------------------------------------------------------
  -- 3. Create bookings spread over the last 7 days
  ---------------------------------------------------------------
  FOR _i IN 1..35 LOOP
    -- Pick a random trip from the last 14 days
    SELECT * INTO _trip FROM public.trips
    WHERE travel_date >= CURRENT_DATE - 13
    ORDER BY random() LIMIT 1;

    IF _trip IS NULL THEN
      CONTINUE;
    END IF;

    -- Realistic amount based on trip price
    _amt := _trip.price + 2;  -- trip price + booking fee
    _ts  := now() - ((_i * 4.8) || ' hours')::interval;
    _seat := 'A' || (1 + (_i % 12));

    _booking_id := gen_random_uuid();

    INSERT INTO public.bookings (id, user_id, trip_id, type, status, seats, amount, fee, payment_label, payment_ref, created_at)
    VALUES (
      _booking_id,
      _uids[1 + ((_i - 1) % 15)],
      _trip.id,
      'scheduled',
      CASE
        WHEN _i <= 25 THEN 'confirmed'
        WHEN _i <= 30 THEN 'completed'
        ELSE 'cancelled'
      END,
      ARRAY[_seat],
      _amt,
      2,
      CASE (_i % 2) WHEN 0 THEN 'Paystack (Card)' ELSE 'MTN MoMo' END,
      'PAY-' || substr(gen_random_uuid()::text, 1, 8),
      _ts
    );

    -- Add passenger record
    INSERT INTO public.booking_passengers (booking_id, name, phone, seat)
    VALUES (
      _booking_id,
      _names[1 + ((_i - 1) % 20)],
      _phones[1 + ((_i - 1) % 20)],
      _seat
    );
  END LOOP;

  ---------------------------------------------------------------
  -- 4. Mark some older trips as completed
  ---------------------------------------------------------------
  UPDATE public.trips SET status = 'completed'
  WHERE travel_date < CURRENT_DATE AND status = 'active';

  RAISE NOTICE 'Demo data seeded: 15 passengers, 5 drivers, 35 bookings.';
END $$;
