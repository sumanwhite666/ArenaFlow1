create extension if not exists "pgcrypto";

create type public.membership_role as enum ('admin', 'coach', 'student');
create type public.wallet_reason as enum ('registration', 'monthly', 'topup', 'adjustment');
create type public.attendance_status as enum ('present', 'late', 'absent');
create type public.request_status as enum ('pending', 'approved', 'rejected');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text,
  phone text,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles on delete set null
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles on delete set null,
  unique (sport_id, name)
);

create table if not exists public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  club_id uuid not null references public.clubs on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, club_id)
);

create table if not exists public.club_join_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  status public.request_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create trigger club_join_requests_updated_at
before update on public.club_join_requests
for each row
execute function public.set_updated_at();

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs on delete cascade,
  sport_id uuid not null references public.sports on delete cascade,
  coach_id uuid references public.profiles on delete set null,
  title text not null,
  starts_at timestamptz not null,
  location text,
  capacity integer,
  qr_token text not null default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now(),
  unique (qr_token)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  student_id uuid not null references public.profiles on delete cascade,
  status public.attendance_status not null default 'present',
  scanned_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs on delete cascade,
  student_id uuid not null references public.profiles on delete cascade,
  balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, student_id),
  check (balance >= 0)
);

create trigger wallets_updated_at
before update on public.wallets
for each row
execute function public.set_updated_at();

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets on delete cascade,
  amount numeric(12, 2) not null,
  reason public.wallet_reason not null,
  note text,
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  registration_fee numeric(12, 2) not null default 100,
  monthly_fee numeric(12, 2) not null default 70,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger app_settings_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

create table if not exists public.billing_runs (
  id uuid primary key default gen_random_uuid(),
  run_month date not null unique,
  executed_at timestamptz not null default now(),
  monthly_fee numeric(12, 2) not null,
  charged_count integer not null default 0,
  skipped_count integer not null default 0
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  club_id uuid references public.clubs on delete cascade,
  type text not null,
  title text not null,
  body text,
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create or replace function public.handle_new_membership()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'student' then
    insert into public.wallets (club_id, student_id)
    values (new.club_id, new.user_id)
    on conflict (club_id, student_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_membership_created
after insert on public.club_memberships
for each row
execute function public.handle_new_membership();

create or replace function public.apply_wallet_transaction()
returns trigger
language plpgsql
as $$
begin
  update public.wallets
  set balance = balance + new.amount
  where id = new.wallet_id;
  return new;
end;
$$;

create trigger on_wallet_transaction
after insert on public.wallet_transactions
for each row
execute function public.apply_wallet_transaction();

create table if not exists public.user_sessions (
  id text primary key,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

insert into public.app_settings (singleton, registration_fee, monthly_fee)
values (true, 100, 70)
on conflict (singleton) do nothing;

-- Default superadmin
insert into public.profiles (email, password_hash, full_name, is_superadmin)
values ('superadmin@arenaflow.local', '$2b$10$XLjkwtNsMEgIN4wLn2crwuOOrnLNCWUkDigRAZ14RxbSPjPdoo5u6', 'Super Admin', true)
on conflict (email) do nothing;
