-- =========================================
-- 06: payment_methods, notifications, sales_report
-- =========================================

-- ---------- Hapus rekening placeholder dari database
alter table public.store_settings
  alter column payment_instructions set default '';
update public.store_settings set payment_instructions = ''
 where payment_instructions like 'Transfer ke rekening BCA 1234567890%';

-- ---------- Metode pembayaran (rekening / QRIS), dikelola admin
create table public.payment_methods (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('bank','qris')),
  provider        text not null check (length(provider) between 2 and 50),
  account_number  text check (account_number ~ '^[0-9]{5,30}$'),
  account_name    text check (length(account_name) <= 100),
  qris_image_path text,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (
    (type = 'bank' and account_number is not null and account_name is not null)
    or (type = 'qris' and qris_image_path is not null)
  )
);
create trigger payment_methods_updated before update on public.payment_methods
  for each row execute function public.set_updated_at();

alter table public.payment_methods enable row level security;

-- Pelanggan login hanya melihat yang aktif. Guest tidak melihat apa pun.
create policy "payment_methods_select_active" on public.payment_methods
  for select to authenticated using (is_active);
create policy "payment_methods_admin_all" on public.payment_methods
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Bucket aset toko (gambar QRIS): baca publik, tulis hanya admin
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-assets', 'store-assets', true, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "store_assets_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'store-assets' and public.is_admin());
create policy "store_assets_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'store-assets' and public.is_admin());
create policy "store_assets_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'store-assets' and public.is_admin());

-- ---------- Notifikasi
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in (
    'order_created','payment_submitted','payment_approved',
    'payment_rejected','order_shipped','order_cancelled','order_expired')),
  title      text not null,
  message    text not null,
  order_id   uuid references public.orders(id) on delete cascade,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx   on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where not is_read;

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Pengguna hanya boleh membaca dan mengubah kolom is_read.
-- Tidak ada INSERT/DELETE: notifikasi hanya dibuat oleh trigger di bawah.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

-- Realtime (tetap tunduk pada RLS)
alter publication supabase_realtime add table public.notifications;

-- ---------- Trigger: buat notifikasi dari perubahan order
create or replace function public.notify_order_events()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, message, order_id)
    select ur.user_id, 'order_created', 'Pesanan baru',
           'Pesanan ' || new.order_number || ' dibuat dan menunggu pembayaran.', new.id
    from public.user_roles ur where ur.role = 'admin';
    return new;
  end if;

  if new.status = 'pending_verification' and old.status is distinct from new.status then
    insert into public.notifications (user_id, type, title, message, order_id)
    select ur.user_id, 'payment_submitted', 'Perlu verifikasi pembayaran',
           'Bukti pembayaran pesanan ' || new.order_number || ' menunggu ditinjau.', new.id
    from public.user_roles ur where ur.role = 'admin';

  elsif new.status = 'paid' and old.status is distinct from new.status then
    insert into public.notifications (user_id, type, title, message, order_id)
    values (new.user_id, 'payment_approved', 'Pembayaran disetujui',
            'Pembayaran pesanan ' || new.order_number || ' sudah diverifikasi.', new.id);

  elsif new.status = 'pending_payment' and new.payment_status = 'rejected'
        and old.payment_status = 'awaiting_verification' then
    insert into public.notifications (user_id, type, title, message, order_id)
    values (new.user_id, 'payment_rejected', 'Pembayaran ditolak',
            'Bukti pembayaran pesanan ' || new.order_number
            || ' ditolak. Buka pesanan untuk melihat alasan dan unggah ulang.', new.id);

  elsif new.status = 'shipped' and old.status is distinct from new.status then
    insert into public.notifications (user_id, type, title, message, order_id)
    values (new.user_id, 'order_shipped', 'Pesanan dikirim',
            'Pesanan ' || new.order_number || ' sedang dikirim. Cek kurir dan resi di detail pesanan.', new.id);

  elsif new.status = 'cancelled' and old.status is distinct from new.status then
    insert into public.notifications (user_id, type, title, message, order_id)
    values (new.user_id, 'order_cancelled', 'Pesanan dibatalkan',
            'Pesanan ' || new.order_number || ' dibatalkan oleh penjual.', new.id);

  elsif new.status = 'expired' and old.status is distinct from new.status then
    insert into public.notifications (user_id, type, title, message, order_id)
    values (new.user_id, 'order_expired', 'Pesanan kedaluwarsa',
            'Pesanan ' || new.order_number || ' kedaluwarsa karena pembayaran tidak diterima tepat waktu.', new.id);
  end if;

  return new;
end;
$$;

revoke all on function public.notify_order_events() from public, anon, authenticated;

create trigger orders_notify
after insert or update of status, payment_status on public.orders
for each row execute function public.notify_order_events();

-- ---------- Laporan penjualan
-- Penjualan diakui saat pembayaran diverifikasi (orders.paid_at).
-- Batas hari dihitung dalam Asia/Jakarta. security invoker: RLS tetap berlaku.
create or replace function public.sales_report(p_from date, p_to date, p_group text)
returns table (
  bucket           date,
  orders_count     bigint,
  product_sales    numeric,
  shipping_revenue numeric,
  total_received   numeric
)
language plpgsql stable
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_group not in ('day','week','month','year') then raise exception 'INVALID_GROUP'; end if;
  if p_to < p_from or p_to - p_from > 3660 then raise exception 'INVALID_RANGE'; end if;

  return query
  select (date_trunc(p_group, o.paid_at at time zone 'Asia/Jakarta'))::date,
         count(*),
         sum(o.subtotal),
         sum(o.shipping_fee),
         sum(o.total)
  from public.orders o
  where o.paid_at is not null
    and o.paid_at >= (p_from::timestamp at time zone 'Asia/Jakarta')
    and o.paid_at <  ((p_to + 1)::timestamp at time zone 'Asia/Jakarta')
  group by 1
  order by 1;
end;
$$;

revoke all on function public.sales_report(date, date, text) from public, anon;
grant execute on function public.sales_report(date, date, text) to authenticated;