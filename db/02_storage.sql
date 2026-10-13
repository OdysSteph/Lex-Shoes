-- =========================================
-- 02_STORAGE: bucket + policy
-- =========================================

-- Gambar produk: publik (dibaca guest), ukuran dan tipe dibatasi
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Bukti bayar: PRIVAT
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 3145728,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- product-images: hanya admin yang boleh menulis
create policy "product_images_admin_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_admin_update"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_admin_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());

-- payment-proofs: path wajib "<user_id>/<order_id>/<file>"
create policy "payment_proofs_customer_insert_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "payment_proofs_select_owner_or_admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
);