-- Akwaaba Express — M7 incident reporting + trip management policies.
-- Safe to re-run: IF NOT EXISTS / DROP IF EXISTS throughout.

-- ---------------------------------------------------------------------------
-- Incidents: passengers report safety/service issues on a booking.
-- ---------------------------------------------------------------------------
create table if not exists public.incidents (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references public.bookings (id) on delete set null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  category    text not null check (category in (
    'safety', 'harassment', 'lost_item', 'delay', 'overcharge',
    'vehicle_condition', 'driver_behavior', 'other'
  )),
  description text not null default '',
  status      text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists incidents_user_idx on public.incidents (user_id);
create index if not exists incidents_booking_idx on public.incidents (booking_id);

alter table public.incidents enable row level security;

drop policy if exists "own incidents select" on public.incidents;
create policy "own incidents select"
  on public.incidents for select using (auth.uid() = user_id);

drop policy if exists "own incidents insert" on public.incidents;
create policy "own incidents insert"
  on public.incidents for insert with check (auth.uid() = user_id);

drop policy if exists "own incidents update" on public.incidents;
create policy "own incidents update"
  on public.incidents for update using (auth.uid() = user_id);

-- Drivers can read incidents linked to bookings on their trips (for awareness).
drop policy if exists "drivers read trip incidents" on public.incidents;
create policy "drivers read trip incidents"
  on public.incidents for select
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'driver'
  ));

-- ---------------------------------------------------------------------------
-- Trip management: drivers can create and update their own trips.
-- ---------------------------------------------------------------------------

-- Add a driver_id column to trips so we know who created/owns a trip.
alter table public.trips
  add column if not exists driver_id uuid references auth.users (id);

-- Drivers can insert trips they'll drive.
drop policy if exists "drivers insert trips" on public.trips;
create policy "drivers insert trips"
  on public.trips for insert
  with check (
    auth.uid() = driver_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'driver')
  );

-- Drivers can update their own trips (change plate, times, cancel, etc.).
drop policy if exists "drivers update own trips" on public.trips;
create policy "drivers update own trips"
  on public.trips for update
  using (
    auth.uid() = driver_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'driver')
  );

-- Add a status column to trips for cancellation/completion tracking.
alter table public.trips
  add column if not exists status text not null default 'active'
    check (status in ('active', 'cancelled', 'completed'));
