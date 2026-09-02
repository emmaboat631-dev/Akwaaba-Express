-- ---------------------------------------------------------------------------
-- C4: Trip status lifecycle + booking status expansion + indexes (I5)
-- ---------------------------------------------------------------------------

-- Expand trips.status to cover the full lifecycle.
-- Postgres won't ALTER a CHECK in place, so drop + re-add.
alter table public.trips drop constraint if exists trips_status_check;
alter table public.trips
  add constraint trips_status_check
    check (status in ('active', 'boarding', 'in_progress', 'completed', 'cancelled'));

-- Expand bookings.status to include checked_in and completed.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
    check (status in ('confirmed', 'cancelled', 'checked_in', 'completed'));

-- I5: Missing indexes for common query patterns.
create index if not exists bookings_trip_idx
  on public.bookings (trip_id);

create index if not exists trips_driver_date_idx
  on public.trips (driver_id, travel_date);

create index if not exists booking_passengers_booking_idx
  on public.booking_passengers (booking_id);

-- C6: Add checked_in flag to booking_passengers for manifest boarding tracking.
alter table public.booking_passengers
  add column if not exists checked_in boolean not null default false;

-- C7: Persist driver payout method on the profile.
alter table public.profiles
  add column if not exists payout_method jsonb;

-- I7: Rate-limit bookings — max 10 active per user.
drop policy if exists "own bookings insert" on public.bookings;
create policy "own bookings insert" on public.bookings for insert
  with check (
    auth.uid() = user_id
    and (select count(*) from public.bookings b where b.user_id = auth.uid() and b.status = 'confirmed') < 10
  );
