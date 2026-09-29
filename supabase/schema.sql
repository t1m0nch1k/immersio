-- Progress mirror for the app.
--
-- One row per user. `state` is the whole `UserState` document as JSON, which is
-- how the app already persists it: every write is a read-modify-write of the
-- entire object, never a partial update. Splitting it into tables would mean a
-- bidirectional mapper and invented merge semantics for data that only ever
-- moves as one piece. Normalise if something ever needs to query *inside* the
-- progress, not before.
--
-- Run once in the Supabase SQL editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  schema_version integer not null default 1,
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'UserState mirror. localStorage stays the source of truth; this exists so progress follows a person to another device.';

alter table public.profiles enable row level security;

-- The anon key ships inside the APK and the web bundle, so it is public. These
-- policies are the only thing standing between that key and somebody's progress.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No delete policy: an account is removed by deleting the auth user, which
-- cascades. Letting a client delete its own row would only make it possible to
-- desynchronise the mirror from the device that is still signed in.

-- `updated_at` is maintained by the database, not the client, so a stale or
-- hostile timestamp cannot be used to win a conflict.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
