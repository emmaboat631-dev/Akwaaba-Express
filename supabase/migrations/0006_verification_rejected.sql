-- Add 'rejected' to verification_status and verification_note column.

alter table public.profiles
  drop constraint if exists profiles_verification_status_check;

alter table public.profiles
  add constraint profiles_verification_status_check
    check (verification_status in ('pending', 'verified', 'rejected'));

alter table public.profiles
  add column if not exists verification_note text;
