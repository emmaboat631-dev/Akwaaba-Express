-- Akwaaba Express — initial schema (thin vertical: auth, profiles, reference
-- data, scheduled trips, bookings). Safe to re-run: all policies use
-- DROP IF EXISTS before CREATE, tables use IF NOT EXISTS, and seed rows
-- use ON CONFLICT DO NOTHING.

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user, created automatically on sign-up.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          text not null default 'passenger' check (role in ('passenger', 'driver')),
  name          text not null default 'Traveller',
  phone         text default '',
  email         text default '',
  is_guest      boolean not null default false,
  reg_no        text not null default ('AKW-' || lpad((floor(random() * 900000) + 100000)::int::text, 6, '0')),
  ghana_card    text default '',
  avatar_color  text default '#06392F',
  -- driver-only (null for passengers)
  license_no          text,
  vehicle_plate       text,
  verification_status text check (verification_status in ('pending', 'verified')),
  rating              numeric(2,1),
  live_destination_id text,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
  on public.profiles for select using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile when a new auth user appears. Role/name/phone are
-- passed through auth metadata (set at signUp time from the client).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, phone, email, is_guest,
    license_no, vehicle_plate, verification_status, rating)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'passenger'),
    coalesce(new.raw_user_meta_data ->> 'name', 'Traveller'),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.email, ''),
    coalesce((new.raw_user_meta_data ->> 'is_guest')::boolean, false),
    case when new.raw_user_meta_data ->> 'role' = 'driver' then '' end,
    case when new.raw_user_meta_data ->> 'role' = 'driver' then '' end,
    case when new.raw_user_meta_data ->> 'role' = 'driver' then 'pending' end,
    case when new.raw_user_meta_data ->> 'role' = 'driver' then round((4.3 + random() * 0.6)::numeric, 1) end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Reference data: readable by everyone, written by admins only (service role).
-- ---------------------------------------------------------------------------
create table if not exists public.cities (
  id     text primary key,
  name   text not null,
  region text not null,
  lat    double precision not null,
  lng    double precision not null
);

create table if not exists public.operators (
  id     text primary key,
  name   text not null,
  mark   text not null,
  color  text not null,
  rating numeric(2,1) not null default 4.5
);

create table if not exists public.bus_types (
  id         text primary key,
  name       text not null,
  seats      int not null,
  cols       int[] not null,
  price_mult numeric not null default 1.0,
  amenities  text[] not null default '{}'
);

alter table public.cities    enable row level security;
alter table public.operators enable row level security;
alter table public.bus_types enable row level security;

drop policy if exists "cities readable"    on public.cities;
create policy "cities readable"    on public.cities    for select using (true);

drop policy if exists "operators readable" on public.operators;
create policy "operators readable" on public.operators for select using (true);

drop policy if exists "bus_types readable" on public.bus_types;
create policy "bus_types readable" on public.bus_types for select using (true);

-- ---------------------------------------------------------------------------
-- Scheduled intercity trips (real rows now, not generated client-side).
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id           uuid primary key default gen_random_uuid(),
  from_id      text not null references public.cities (id),
  to_id        text not null references public.cities (id),
  travel_date  date not null,
  operator_id  text not null references public.operators (id),
  bus_type_id  text not null references public.bus_types (id),
  plate        text not null,
  depart_mins  int not null,
  arrive_mins  int not null,
  duration_mins int not null,
  distance_km  int not null,
  price        int not null,
  seats_total  int not null,
  created_at   timestamptz not null default now()
);
create index if not exists trips_route_date_idx on public.trips (from_id, to_id, travel_date);

alter table public.trips enable row level security;

drop policy if exists "trips readable" on public.trips;
create policy "trips readable" on public.trips for select using (true);

-- ---------------------------------------------------------------------------
-- Bookings + per-passenger rows. A booking belongs to the auth user.
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  trip_id       uuid references public.trips (id),
  type          text not null default 'scheduled' check (type in ('scheduled', 'live')),
  status        text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  seats         text[] not null default '{}',
  amount        numeric not null,
  fee           numeric not null default 0,
  payment_label text,
  payment_ref   text,
  live_route    text,          -- for live hails: "To Circle"
  checked_in_at timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists bookings_user_idx on public.bookings (user_id);

create table if not exists public.booking_passengers (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  name       text not null,
  phone      text default '',
  id_no      text default '',
  seat       text
);

alter table public.bookings           enable row level security;
alter table public.booking_passengers enable row level security;

-- Passengers manage their own bookings.
drop policy if exists "own bookings select" on public.bookings;
create policy "own bookings select" on public.bookings for select using (auth.uid() = user_id);

drop policy if exists "own bookings insert" on public.bookings;
create policy "own bookings insert" on public.bookings for insert with check (auth.uid() = user_id);

drop policy if exists "own bookings update" on public.bookings;
create policy "own bookings update" on public.bookings for update using (auth.uid() = user_id);

-- Drivers may read a booking they are checking in (validated by scan).
drop policy if exists "drivers read bookings for check-in" on public.bookings;
create policy "drivers read bookings for check-in"
  on public.bookings for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'driver'));

drop policy if exists "passengers of own booking readable" on public.booking_passengers;
create policy "passengers of own booking readable"
  on public.booking_passengers for select
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));

drop policy if exists "insert passengers on own booking" on public.booking_passengers;
create policy "insert passengers on own booking"
  on public.booking_passengers for insert
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Saved places + payment methods (per user).
-- ---------------------------------------------------------------------------
create table if not exists public.saved_places (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label   text not null,
  address text not null,
  icon    text default 'other'
);
create table if not exists public.payment_methods (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type    text not null,
  label   text not null,
  detail  text
);
alter table public.saved_places    enable row level security;
alter table public.payment_methods enable row level security;

drop policy if exists "own places" on public.saved_places;
create policy "own places"  on public.saved_places    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own methods" on public.payment_methods;
create policy "own methods" on public.payment_methods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed reference data.
-- ---------------------------------------------------------------------------
insert into public.cities (id, name, region, lat, lng) values
  -- Tier 1: Major cities
  ('accra',         'Accra',           'Greater Accra', 5.6037,  -0.1870),
  ('kumasi',        'Kumasi',          'Ashanti',       6.6885,  -1.6244),
  ('tamale',        'Tamale',          'Northern',      9.4008,  -0.8393),
  ('takoradi',      'Takoradi',        'Western',       4.8845,  -1.7554),
  ('capecoast',     'Cape Coast',      'Central',       5.1053,  -1.2466),
  -- Tier 2: Regional capitals
  ('sunyani',       'Sunyani',         'Bono',          7.3349,  -2.3123),
  ('techiman',      'Techiman',        'Bono East',     7.5907,  -1.9390),
  ('ho',            'Ho',              'Volta',         6.6110,   0.4710),
  ('koforidua',     'Koforidua',       'Eastern',       6.0940,  -0.2591),
  ('bolgatanga',    'Bolgatanga',      'Upper East',   10.7856,  -0.8514),
  ('wa',            'Wa',              'Upper West',   10.0607,  -2.5099),
  ('tema',          'Tema',            'Greater Accra', 5.6698,  -0.0166),
  -- Tier 3: Notable towns
  ('navrongo',      'Navrongo',        'Upper East',   10.8956,  -1.0921),
  ('bawku',         'Bawku',           'Upper East',   11.0616,  -0.2417),
  ('yendi',         'Yendi',           'Northern',      9.4427,  -0.0099),
  ('obuasi',        'Obuasi',          'Ashanti',       6.2059,  -1.6834),
  ('asantemampong', 'Asante Mampong',  'Ashanti',       7.0627,  -1.4001),
  ('asantebekwai',  'Asante Bekwai',   'Ashanti',       6.4533,  -1.5819),
  ('dunkwa',        'Dunkwa-on-Offin', 'Central',       5.9656,  -1.7800),
  ('kintampo',      'Kintampo',        'Bono East',     8.0563,  -1.7306),
  ('tarkwa',        'Tarkwa',          'Western',       5.3005,  -1.9922),
  ('ejura',         'Ejura',           'Ashanti',       7.3856,  -1.3562),
  ('wenchi',        'Wenchi',          'Bono',          7.7333,  -2.1000),
  ('dormaa',        'Dormaa Ahenkro',  'Bono',          7.2795,  -2.8797),
  ('nsawkaw',       'Nsawkaw',         'Bono',          7.8744,  -2.3166)
on conflict (id) do nothing;

insert into public.operators (id, name, mark, color, rating) values
  ('stc',   'STC Intercity',    'STC', '#274F9E', 4.6),
  ('vip',   'VIP Jeoun',        'VIP', '#B5544A', 4.8),
  ('oa',    'OA Travel & Tours','OA',  '#1F6B44', 4.5),
  ('metro', 'Metro Mass',       'MM',  '#B9822B', 4.1),
  ('aaba',  'Aaba Express',     'AE',  '#5B3BA8', 4.7)
on conflict (id) do nothing;

insert into public.bus_types (id, name, seats, cols, price_mult, amenities) values
  ('vip',      'VIP',        33, '{2,1}', 1.6, '{"Air conditioning","Reclining seats","WiFi","USB charging","On-board TV"}'),
  ('standard', 'Standard',   44, '{2,2}', 1.0, '{"Air conditioning","USB charging","Reading light"}'),
  ('mini',     'Mini Coach', 18, '{2,1}', 0.7, '{"Fan","Frequent stops"}')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Seed scheduled trips for the next 14 days across popular routes.
-- Wrapped in a DO block so it only runs when the trips table is empty,
-- preventing duplicate rows on every re-run.
-- ---------------------------------------------------------------------------
do $$
begin
  if (select count(*) from public.trips) = 0 then
    insert into public.trips (from_id, to_id, travel_date, operator_id, bus_type_id, plate,
      depart_mins, arrive_mins, duration_mins, distance_km, price, seats_total)
    select
      r.from_id, r.to_id, d::date, o.id, bt.id,
      'GR ' || (1000 + floor(random() * 9000))::int || '-' || (10 + floor(random() * 14))::int,
      dep,
      dep + dur,
      dur,
      km,
      greatest(20, round((8 + 0.42 * km) * bt.price_mult))::int,
      bt.seats
    from (
      values
        ('accra','kumasi',250),    ('accra','takoradi',220),  ('accra','capecoast',145),
        ('accra','tamale',600),    ('kumasi','tamale',380),   ('accra','ho',165),
        ('accra','sunyani',390),   ('accra','koforidua',85),  ('kumasi','sunyani',120),
        ('accra','tema',30),       ('accra','bolgatanga',680),('kumasi','obuasi',55),
        ('accra','tarkwa',210),    ('accra','techiman',330),  ('tamale','bolgatanga',160)
    ) as r(from_id, to_id, km)
    cross join generate_series(current_date, current_date + interval '13 days', interval '1 day') as d
    cross join lateral (
      select id, price_mult, seats from public.bus_types order by random() limit 2
    ) as bt
    cross join lateral (select o.id from public.operators o order by random() limit 1) as o
    cross join lateral (
      select (300 + floor(random() * 900))::int as dep,
             round(r.km / 56.0 * 60 * (case bt.id when 'mini' then 1.25 when 'vip' then 0.95 else 1.08 end))::int as dur
    ) as t;
  end if;
end;
$$;
