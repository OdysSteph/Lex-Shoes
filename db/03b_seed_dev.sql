insert into public.categories (name, slug) values
  ('Sepatu','sepatu'), ('Dompet','dompet'), ('Jaket','jaket'), ('Ikat Pinggang','ikat-pinggang');

insert into public.products (category_id, name, slug, description, price, sku)
select id, 'Sepatu Kulit Pantofel', 'sepatu-kulit-pantofel',
       'Sepatu pantofel kulit asli buatan pengrajin Cibaduyut.', 285000, 'SPT-001'
from public.categories where slug = 'sepatu';

insert into public.products (category_id, name, slug, description, price, sku)
select id, 'Sepatu Sneakers Kulit', 'sepatu-sneakers-kulit',
       'Sneakers kasual dengan sol karet anti-selip.', 245000, 'SPT-002'
from public.categories where slug = 'sepatu';

insert into public.products (category_id, name, slug, description, price, sku)
select id, 'Dompet Kulit Lipat', 'dompet-kulit-lipat',
       'Dompet lipat kulit sapi dengan 6 slot kartu.', 95000, 'DMP-001'
from public.categories where slug = 'dompet';

insert into public.products (category_id, name, slug, description, price, sku)
select id, 'Ikat Pinggang Kulit', 'ikat-pinggang-kulit',
       'Ikat pinggang kulit dengan gesper stainless.', 75000, 'IKP-001'
from public.categories where slug = 'ikat-pinggang';

-- Varian sepatu (ukuran)
insert into public.product_variants (product_id, sku, size, color, stock)
select p.id, p.sku || '-' || s, s, 'Hitam', 5
from public.products p, unnest(array['40','41','42','43']) as s
where p.slug in ('sepatu-kulit-pantofel','sepatu-sneakers-kulit');

-- Varian non-sepatu (satu varian default)
insert into public.product_variants (product_id, sku, color, stock)
select p.id, p.sku || '-STD', 'Coklat', 12
from public.products p where p.slug in ('dompet-kulit-lipat','ikat-pinggang-kulit');