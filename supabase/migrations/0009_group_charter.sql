-- Group Charter feature — tables, indexes, RLS policies, seed data.

-- Charter event types
CREATE TABLE IF NOT EXISTS public.charter_event_types (
  id    text PRIMARY KEY,
  label text NOT NULL
);

ALTER TABLE public.charter_event_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "charter_event_types_readable" ON public.charter_event_types;
CREATE POLICY "charter_event_types_readable"
  ON public.charter_event_types FOR SELECT USING (true);

INSERT INTO public.charter_event_types (id, label) VALUES
  ('church',    'Church / Religious'),
  ('school',    'School / Educational'),
  ('corporate', 'Corporate / Business'),
  ('wedding',   'Wedding / Ceremony'),
  ('funeral',   'Funeral'),
  ('excursion', 'Tour / Excursion'),
  ('sports',    'Sports Team'),
  ('other',     'Other')
ON CONFLICT (id) DO NOTHING;

-- Charter pricing rates per bus type
CREATE TABLE IF NOT EXISTS public.charter_pricing (
  bus_type_id   text PRIMARY KEY REFERENCES public.bus_types(id),
  charter_base  int NOT NULL,
  rate_per_km   numeric NOT NULL,
  rate_per_hour numeric NOT NULL
);

ALTER TABLE public.charter_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "charter_pricing_readable" ON public.charter_pricing;
CREATE POLICY "charter_pricing_readable"
  ON public.charter_pricing FOR SELECT USING (true);

INSERT INTO public.charter_pricing (bus_type_id, charter_base, rate_per_km, rate_per_hour) VALUES
  ('mini',     1200, 3.50, 60),
  ('standard', 2000, 5.00, 100),
  ('vip',      3000, 7.00, 140)
ON CONFLICT (bus_type_id) DO NOTHING;

-- Charters
CREATE TABLE IF NOT EXISTS public.charters (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN (
                        'pending','quoted','accepted','deposit_paid',
                        'confirmed','in_progress','completed','cancelled'
                      )),
  pickup_city_id    text REFERENCES public.cities(id),
  pickup_address    text NOT NULL DEFAULT '',
  dest_city_id      text REFERENCES public.cities(id),
  dest_address      text NOT NULL DEFAULT '',
  depart_date       date NOT NULL,
  depart_time       text NOT NULL,
  return_date       date,
  return_time       text,
  is_return_trip    boolean NOT NULL DEFAULT false,
  passenger_count   int NOT NULL,
  event_type_id     text REFERENCES public.charter_event_types(id),
  group_name        text NOT NULL,
  special_requests  text DEFAULT '',
  bus_type_id       text REFERENCES public.bus_types(id),
  operator_id       text REFERENCES public.operators(id),
  driver_id         uuid REFERENCES auth.users(id),
  plate             text,
  estimated_price   numeric,
  quoted_price      numeric,
  deposit_amount    numeric,
  deposit_paid      numeric DEFAULT 0,
  balance_paid      numeric DEFAULT 0,
  payment_ref       text UNIQUE,
  deposit_ref       text,
  balance_ref       text,
  charter_ref       text NOT NULL UNIQUE,
  admin_notes       text DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS charters_organiser_idx ON public.charters(organiser_id);
CREATE INDEX IF NOT EXISTS charters_status_idx ON public.charters(status);
CREATE INDEX IF NOT EXISTS charters_date_idx ON public.charters(depart_date);

ALTER TABLE public.charters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_charters_select" ON public.charters;
CREATE POLICY "own_charters_select"
  ON public.charters FOR SELECT
  USING (
    auth.uid() = organiser_id
    OR auth.uid() = driver_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "own_charters_insert" ON public.charters;
CREATE POLICY "own_charters_insert"
  ON public.charters FOR INSERT
  WITH CHECK (auth.uid() = organiser_id);

DROP POLICY IF EXISTS "own_charters_update" ON public.charters;
CREATE POLICY "own_charters_update"
  ON public.charters FOR UPDATE
  USING (
    auth.uid() = organiser_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Charter passengers
CREATE TABLE IF NOT EXISTS public.charter_passengers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charter_id  uuid NOT NULL REFERENCES public.charters(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text DEFAULT '',
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed','boarded','no_show')),
  qr_value    text,
  boarded_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS charter_passengers_charter_idx ON public.charter_passengers(charter_id);

ALTER TABLE public.charter_passengers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "charter_passengers_select" ON public.charter_passengers;
CREATE POLICY "charter_passengers_select"
  ON public.charter_passengers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.charters c
    WHERE c.id = charter_id
    AND (c.organiser_id = auth.uid() OR c.driver_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  ));

DROP POLICY IF EXISTS "charter_passengers_insert" ON public.charter_passengers;
CREATE POLICY "charter_passengers_insert"
  ON public.charter_passengers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.charters c
    WHERE c.id = charter_id AND c.organiser_id = auth.uid()
  ));

DROP POLICY IF EXISTS "charter_passengers_update" ON public.charter_passengers;
CREATE POLICY "charter_passengers_update"
  ON public.charter_passengers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.charters c
    WHERE c.id = charter_id
    AND (c.organiser_id = auth.uid() OR c.driver_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  ));

DROP POLICY IF EXISTS "charter_passengers_delete" ON public.charter_passengers;
CREATE POLICY "charter_passengers_delete"
  ON public.charter_passengers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.charters c
    WHERE c.id = charter_id AND c.organiser_id = auth.uid()
  ));
