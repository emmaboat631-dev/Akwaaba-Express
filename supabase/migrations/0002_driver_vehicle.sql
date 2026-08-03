-- Akwaaba Express — driver vehicle profile columns.
-- Adds the fields the Vehicle Setup page collects that had no home in the
-- initial schema (operator, bus type, model, colour). Additive-only: no
-- backfill needed, existing rows keep NULL for these columns.
--
-- Safe to re-run: `add column if not exists` + guarded FKs.

alter table public.profiles
  add column if not exists operator_id    text,
  add column if not exists bus_type_id    text,
  add column if not exists vehicle_model  text,
  add column if not exists vehicle_color  text;

-- Foreign keys catch typos / stale ids at write time. Wrapped in DO blocks
-- so re-running doesn't error on "constraint already exists".
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_operator_fk'
  ) then
    alter table public.profiles
      add constraint profiles_operator_fk
      foreign key (operator_id) references public.operators (id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_bus_type_fk'
  ) then
    alter table public.profiles
      add constraint profiles_bus_type_fk
      foreign key (bus_type_id) references public.bus_types (id);
  end if;
end$$;
