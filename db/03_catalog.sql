-- =========================================
-- 03_CATALOG: kategori, produk, varian, gambar, pengaturan toko
-- =========================================

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name        text not null check (length(name) between 2 and 200),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  price       numeric(12,0) not null check (price >= 0),   -- IDR, tanpa desimal
  sku         text unique,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Stok dihitung PER VARIAN (mis. ukuran 42 / hitam)
create table public.product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku        text not null unique,
  size       text,
  color      text,
  stock      integer not null default 0 check (stock >= 0),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, color)
);

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path       text not null,            -- path di bucket product-images
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Pengaturan toko: satu baris saja (singleton)
create table public.store_settings (
  id                      boolean primary key default true check (id),
  store_name              text not null default 'Toko Sepatu Cibaduyut',
  contact_phone           text,
  contact_email           text,
  address                 text,
  shipping_fee            numeric(12,0) not null default 20000 check (shipping_fee >= 0),
  payment_expiry_minutes  integer not null default 60
                          check (payment_expiry_minutes between 5 and 10080),
  updated_at              timestamptz not null default now()
);
insert into public.store_settings default values;

-- Index
create index products_category_idx on public.products (category_id);
create index products_active_created_idx on public.products (is_active, created_at desc);
create index variants_product_idx on public.product_variants (product_id);
create index images_product_idx on public.product_images (product_id, sort_order);

-- updated_at otomatis
create trigger categories_updated before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products
  for each row execute function public.set_updated_at();
create trigger variants_updated before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger settings_updated before update on public.store_settings
  for each row execute function public.set_updated_at();

-- View untuk listing katalog (stok total + gambar utama).
-- security_invoker = RLS tabel dasar tetap berlaku untuk pemanggil.
create view public.product_listing with (security_invoker = true) as
select
  p.id, p.name, p.slug, p.price, p.created_at, p.is_active,
  c.id   as category_id,
  c.name as category_name,
  c.slug as category_slug,
  coalesce((select sum(v.stock) from public.product_variants v
            where v.product_id = p.id and v.is_active), 0)::int as total_stock,
  (select i.path from public.product_images i
   where i.product_id = p.id order by i.sort_order, i.created_at limit 1) as image_path
from public.products p
join public.categories c on c.id = p.category_id;

grant select on public.product_listing to anon, authenticated;

-- ============ RLS ============
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images   enable row level security;
alter table public.store_settings   enable row level security;

-- PENTING: policy untuk anon TIDAK boleh memanggil is_admin()
-- (fungsi itu di-revoke dari anon), jadi dibuat terpisah dari policy admin.

-- categories
create policy "categories_select_public" on public.categories
  for select to anon, authenticated using (true);
create policy "categories_admin_all" on public.categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- products: publik hanya melihat yang aktif
create policy "products_select_active" on public.products
  for select to anon, authenticated using (is_active);
create policy "products_admin_all" on public.products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- variants: publik hanya varian aktif dari produk aktif
create policy "variants_select_active" on public.product_variants
  for select to anon, authenticated
  using (is_active and exists (
    select 1 from public.products p where p.id = product_id and p.is_active));
create policy "variants_admin_all" on public.product_variants
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- images: publik hanya gambar dari produk aktif
create policy "images_select_active" on public.product_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p where p.id = product_id and p.is_active));
create policy "images_admin_all" on public.product_images
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- store_settings: semua boleh baca, hanya admin yang boleh ubah
create policy "settings_select_public" on public.store_settings
  for select to anon, authenticated using (true);
create policy "settings_admin_update" on public.store_settings
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());