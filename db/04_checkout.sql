-- =========================================
-- 04_CHECKOUT
-- =========================================

alter table public.store_settings
  add column payment_instructions text not null
  default 'Transfer ke rekening BCA 1234567890 a.n. Nama Toko. Cantumkan nomor pesanan pada berita transfer.';

-- ---------- Wilayah (read-only untuk publik; diisi lewat script service role)
create table public.provinces (id text primary key, name text not null);
create table public.regencies (
  id text primary key,
  province_id text not null references public.provinces(id) on delete cascade,
  name text not null
);
create table public.districts (
  id text primary key,
  regency_id text not null references public.regencies(id) on delete cascade,
  name text not null
);
create index regencies_province_idx on public.regencies (province_id);
create index districts_regency_idx on public.districts (regency_id);

alter table public.provinces enable row level security;
alter table public.regencies enable row level security;
alter table public.districts enable row level security;
create policy "provinces_read" on public.provinces for select to anon, authenticated using (true);
create policy "regencies_read" on public.regencies for select to anon, authenticated using (true);
create policy "districts_read" on public.districts for select to anon, authenticated using (true);

-- ---------- Alamat
create table public.addresses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  label          text not null default 'Rumah',
  recipient_name text not null,
  phone          text not null,
  province_id    text not null references public.provinces(id),
  regency_id     text not null references public.regencies(id),
  district_id    text not null references public.districts(id),
  village        text not null,
  postal_code    text not null check (postal_code ~ '^[0-9]{5}$'),
  street         text not null,
  notes          text,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default_idx on public.addresses (user_id) where is_default;
create trigger addresses_updated before update on public.addresses
  for each row execute function public.set_updated_at();

-- ---------- Keranjang
create table public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity   integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  unique (user_id, variant_id)
);

-- ---------- Order
create sequence public.order_number_seq;

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique,
  user_id          uuid not null references auth.users(id) on delete restrict,
  status           text not null default 'pending_payment' check (status in
    ('pending_payment','pending_verification','paid','processing','shipped','completed','cancelled','expired')),
  payment_status   text not null default 'awaiting_payment' check (payment_status in
    ('awaiting_payment','awaiting_verification','verified','rejected','expired')),
  subtotal         numeric(12,0) not null check (subtotal >= 0),
  shipping_fee     numeric(12,0) not null check (shipping_fee >= 0),
  total            numeric(12,0) not null,
  shipping_address jsonb not null,           -- snapshot alamat
  courier          text,
  tracking_number  text,
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (total = subtotal + shipping_fee)
);
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_expiry_idx on public.orders (expires_at) where status = 'pending_payment';
create trigger orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  variant_id   uuid not null references public.product_variants(id) on delete restrict,
  product_name text not null,     -- snapshot
  sku          text not null,     -- snapshot
  size         text,
  color        text,
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(12,0) not null check (unit_price >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.inventory_movements (
  id         uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  order_id   uuid references public.orders(id) on delete set null,
  delta      integer not null,
  reason     text not null,
  created_at timestamptz not null default now()
);
create index inv_mov_variant_idx on public.inventory_movements (variant_id, created_at desc);

-- ============ RLS ============
alter table public.addresses            enable row level security;
alter table public.cart_items           enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.inventory_movements  enable row level security;

create policy "addresses_own_all" on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "cart_own_all" on public.cart_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- orders: hanya BACA. Tidak ada policy tulis, jadi hanya create_order() / fungsi server yang bisa menulis.
create policy "orders_select_own_or_admin" on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "order_items_select_own_or_admin" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_id
                   and (o.user_id = (select auth.uid()) or public.is_admin())));

create policy "inv_mov_admin_select" on public.inventory_movements for select to authenticated
  using (public.is_admin());

-- ============ create_order: ATOMIC ============
create or replace function public.create_order(p_address_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_addr     record;
  v_settings record;
  v_subtotal numeric(12,0);
  v_cart_cnt integer;
  v_order_id uuid := gen_random_uuid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select a.*, p.name as province_name, r.name as regency_name, d.name as district_name
    into v_addr
  from public.addresses a
  join public.provinces p on p.id = a.province_id
  join public.regencies r on r.id = a.regency_id
  join public.districts d on d.id = a.district_id
  where a.id = p_address_id and a.user_id = v_uid;
  if not found then raise exception 'ADDRESS_NOT_FOUND'; end if;

  select count(*) into v_cart_cnt from public.cart_items where user_id = v_uid;
  if v_cart_cnt = 0 then raise exception 'CART_EMPTY'; end if;

  -- Kunci semua varian di keranjang (urut by id agar tidak deadlock)
  perform 1 from public.product_variants v
  join public.cart_items c on c.variant_id = v.id
  where c.user_id = v_uid
  order by v.id
  for update of v;

  -- Validasi stok dan status SETELAH dikunci
  if (select count(*) from public.cart_items c
        join public.product_variants v on v.id = c.variant_id
        join public.products p on p.id = v.product_id
      where c.user_id = v_uid and v.is_active and p.is_active and v.stock >= c.quantity
     ) <> v_cart_cnt then
    raise exception 'STOCK_UNAVAILABLE';
  end if;

  select coalesce(sum(p.price * c.quantity), 0) into v_subtotal
  from public.cart_items c
  join public.product_variants v on v.id = c.variant_id
  join public.products p on p.id = v.product_id
  where c.user_id = v_uid;

  select shipping_fee, payment_expiry_minutes into v_settings from public.store_settings;

  insert into public.orders
    (id, order_number, user_id, subtotal, shipping_fee, total, shipping_address, expires_at)
  values (
    v_order_id,
    'LX-' || to_char(timezone('Asia/Jakarta', now()), 'YYMMDD') || '-'
           || lpad(nextval('public.order_number_seq')::text, 5, '0'),
    v_uid, v_subtotal, v_settings.shipping_fee, v_subtotal + v_settings.shipping_fee,
    jsonb_build_object(
      'recipient_name', v_addr.recipient_name, 'phone', v_addr.phone,
      'province', v_addr.province_name, 'regency', v_addr.regency_name,
      'district', v_addr.district_name, 'village', v_addr.village,
      'postal_code', v_addr.postal_code, 'street', v_addr.street, 'notes', v_addr.notes),
    now() + make_interval(mins => v_settings.payment_expiry_minutes)
  );

  insert into public.order_items
    (order_id, variant_id, product_name, sku, size, color, quantity, unit_price)
  select v_order_id, v.id, p.name, v.sku, v.size, v.color, c.quantity, p.price
  from public.cart_items c
  join public.product_variants v on v.id = c.variant_id
  join public.products p on p.id = v.product_id
  where c.user_id = v_uid;

  update public.product_variants v set stock = v.stock - c.quantity
  from public.cart_items c
  where c.variant_id = v.id and c.user_id = v_uid;

  insert into public.inventory_movements (variant_id, order_id, delta, reason)
  select c.variant_id, v_order_id, -c.quantity, 'order_created'
  from public.cart_items c where c.user_id = v_uid;

  delete from public.cart_items where user_id = v_uid;

  return v_order_id;
end;
$$;

revoke all on function public.create_order(uuid) from public, anon;
grant execute on function public.create_order(uuid) to authenticated;

-- ============ expire_orders: kembalikan stok order yang lewat waktu ============
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
         and payment_status = 'awaiting_payment'
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

revoke all on function public.expire_orders() from public, anon, authenticated;