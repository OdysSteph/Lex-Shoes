-- =========================================
-- 05_PAYMENTS: bukti bayar, verifikasi, status pengiriman
-- =========================================

alter table public.orders
  add column paid_at      timestamptz,
  add column verified_by  uuid references auth.users(id),
  add column shipped_at   timestamptz,
  add column completed_at timestamptz,
  add column cancel_reason text;

create table public.payment_proofs (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete restrict,
  path             text not null unique,
  status           text not null default 'submitted'
                   check (status in ('submitted','approved','rejected')),
  submitted_at     timestamptz not null default now(),
  reviewed_by      uuid references auth.users(id),
  reviewed_at      timestamptz,
  rejection_reason text,
  check ((status = 'submitted') = (reviewed_at is null))
);
-- Hanya boleh ada satu bukti "menunggu tinjauan" per order
create unique index payment_proofs_one_open_idx
  on public.payment_proofs (order_id) where status = 'submitted';
create index payment_proofs_order_idx
  on public.payment_proofs (order_id, submitted_at desc);

alter table public.payment_proofs enable row level security;

-- Hanya SELECT. Semua penulisan lewat fungsi di bawah.
create policy "proofs_select_own_or_admin" on public.payment_proofs
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- ============ submit_payment_proof (pelanggan) ============
create or replace function public.submit_payment_proof(p_order_id uuid, p_path text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_order  record;
  v_prefix text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_order from public.orders
   where id = p_order_id and user_id = v_uid
   for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.status <> 'pending_payment'
     or v_order.payment_status not in ('awaiting_payment','rejected') then
    raise exception 'INVALID_STATE';
  end if;
  if v_order.expires_at <= now() then raise exception 'ORDER_EXPIRED'; end if;

  -- Path file wajib berada di folder <user_id>/<order_id>/
  v_prefix := v_uid::text || '/' || p_order_id::text || '/';
  if left(p_path, length(v_prefix)) <> v_prefix then raise exception 'INVALID_PATH'; end if;

  insert into public.payment_proofs (order_id, user_id, path)
  values (p_order_id, v_uid, p_path);

  update public.orders
     set status = 'pending_verification', payment_status = 'awaiting_verification'
   where id = p_order_id;
end;
$$;

-- ============ verify_payment (admin) ============
create or replace function public.verify_payment(p_order_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_order record;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.status <> 'pending_verification'
     or v_order.payment_status <> 'awaiting_verification' then
    raise exception 'INVALID_STATE';   -- termasuk verifikasi ganda
  end if;

  update public.payment_proofs
     set status = 'approved', reviewed_by = v_uid, reviewed_at = now()
   where order_id = p_order_id and status = 'submitted';

  update public.orders
     set status = 'paid', payment_status = 'verified',
         paid_at = now(), verified_by = v_uid
   where id = p_order_id;
end;
$$;

-- ============ reject_payment (admin) ============
-- Order kembali ke pending_payment dan diberi satu periode baru untuk upload ulang.
create or replace function public.reject_payment(p_order_id uuid, p_reason text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_order   record;
  v_minutes integer;
  v_reason  text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if length(v_reason) < 3 or length(v_reason) > 300 then raise exception 'REASON_REQUIRED'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.status <> 'pending_verification'
     or v_order.payment_status <> 'awaiting_verification' then
    raise exception 'INVALID_STATE';
  end if;

  select payment_expiry_minutes into v_minutes from public.store_settings;

  update public.payment_proofs
     set status = 'rejected', reviewed_by = v_uid, reviewed_at = now(),
         rejection_reason = v_reason
   where order_id = p_order_id and status = 'submitted';

  update public.orders
     set status = 'pending_payment', payment_status = 'rejected',
         expires_at = now() + make_interval(mins => v_minutes)
   where id = p_order_id;
end;
$$;

-- ============ advance_order (admin): paid -> processing -> shipped -> completed ============
create or replace function public.advance_order(
  p_order_id uuid, p_to text, p_courier text, p_tracking text
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_order   record;
  v_courier text := btrim(coalesce(p_courier, ''));
  v_track   text := btrim(coalesce(p_tracking, ''));
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_to not in ('processing','shipped','completed') then raise exception 'INVALID_STATE'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if p_to = 'processing' and v_order.status = 'paid' then
    update public.orders set status = 'processing' where id = p_order_id;

  elsif p_to = 'shipped' and v_order.status = 'processing' then
    if length(v_courier) = 0 or length(v_track) = 0
       or length(v_courier) > 50 or length(v_track) > 80 then
      raise exception 'COURIER_REQUIRED';
    end if;
    update public.orders
       set status = 'shipped', courier = v_courier, tracking_number = v_track,
           shipped_at = now()
     where id = p_order_id;

  elsif p_to = 'completed' and v_order.status = 'shipped' then
    update public.orders set status = 'completed', completed_at = now() where id = p_order_id;

  else
    raise exception 'INVALID_STATE';
  end if;
end;
$$;

-- ============ cancel_order_admin: hanya sebelum dibayar ============
create or replace function public.cancel_order_admin(p_order_id uuid, p_reason text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_order  record;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if length(v_reason) < 3 or length(v_reason) > 300 then raise exception 'REASON_REQUIRED'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status not in ('pending_payment','pending_verification') then
    raise exception 'INVALID_STATE';
  end if;

  update public.payment_proofs
     set status = 'rejected', reviewed_by = v_uid, reviewed_at = now(),
         rejection_reason = 'Pesanan dibatalkan: ' || v_reason
   where order_id = p_order_id and status = 'submitted';

  -- kembalikan stok
  update public.product_variants v set stock = v.stock + s.qty
  from (select variant_id, sum(quantity)::int as qty
        from public.order_items where order_id = p_order_id group by variant_id) s
  where v.id = s.variant_id;

  insert into public.inventory_movements (variant_id, order_id, delta, reason)
  select variant_id, order_id, quantity, 'order_cancelled'
  from public.order_items where order_id = p_order_id;

  update public.orders
     set status = 'cancelled', cancel_reason = v_reason,
         payment_status = case when payment_status = 'awaiting_verification'
                               then 'rejected' else payment_status end
   where id = p_order_id;
end;
$$;

-- ============ expire_orders: kini juga menutup order yang pembayarannya ditolak ============
create or replace function public.expire_orders()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare v_count integer;
begin
  create temporary table _expired on commit drop as
    with e as (
      update public.orders
         set status = 'expired', payment_status = 'expired'
       where status = 'pending_payment'
         and payment_status in ('awaiting_payment','rejected')
         and expires_at < now()
      returning id
    ) select id from e;

  update public.product_variants v set stock = v.stock + s.qty
  from (select oi.variant_id, sum(oi.quantity)::int as qty
        from public.order_items oi join _expired e on e.id = oi.order_id
        group by oi.variant_id) s
  where v.id = s.variant_id;

  insert into public.inventory_movements (variant_id, order_id, delta, reason)
  select oi.variant_id, oi.order_id, oi.quantity, 'order_expired'
  from public.order_items oi join _expired e on e.id = oi.order_id;

  select count(*) into v_count from _expired;
  return v_count;
end;
$$;

-- ============ Hak eksekusi ============
revoke all on function public.submit_payment_proof(uuid, text)        from public, anon;
revoke all on function public.verify_payment(uuid)                    from public, anon;
revoke all on function public.reject_payment(uuid, text)              from public, anon;
revoke all on function public.advance_order(uuid, text, text, text)   from public, anon;
revoke all on function public.cancel_order_admin(uuid, text)          from public, anon;
grant execute on function public.submit_payment_proof(uuid, text)      to authenticated;
grant execute on function public.verify_payment(uuid)                  to authenticated;
grant execute on function public.reject_payment(uuid, text)            to authenticated;
grant execute on function public.advance_order(uuid, text, text, text) to authenticated;
grant execute on function public.cancel_order_admin(uuid, text)        to authenticated;