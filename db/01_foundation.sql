-- =========================================
-- 01_FOUNDATION: profiles + roles + RBAC helper
-- =========================================

create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'admin');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profil (sengaja TIDAK ada kolom role)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Role dipisah dari profil agar tidak bisa diedit user
create table public.user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       public.app_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- Cek admin. SECURITY DEFINER agar tidak rekursif di RLS
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Otomatis buat profil + role 'customer' saat user mendaftar
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ RLS ============
alter table public.profiles   enable row level security;
alter table public.user_roles enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Tidak ada policy INSERT/UPDATE/DELETE di user_roles:
-- role hanya bisa diubah lewat SQL Editor / service role.
create policy "user_roles_select_own"
on public.user_roles for select to authenticated
using (user_id = (select auth.uid()));