-- C5: Server-side driver earnings — trip_completions table.
create table if not exists public.trip_completions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id),
  trip_id uuid references public.trips(id),
  type text not null check (type in ('scheduled', 'live')),
  amount numeric(10,2) not null default 0,
  distance_km numeric(8,2) not null default 0,
  completed_at timestamptz not null default now()
);

alter table public.trip_completions enable row level security;

create policy "drivers read own completions" on public.trip_completions
  for select using (auth.uid() = driver_id);

create policy "drivers insert own completions" on public.trip_completions
  for insert with check (auth.uid() = driver_id);

create index if not exists trip_completions_driver_idx
  on public.trip_completions (driver_id, completed_at desc);
