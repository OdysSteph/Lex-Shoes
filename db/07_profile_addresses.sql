-- Validasi nomor HP pada profil (kolom boleh kosong)
alter table public.profiles
  add constraint profiles_phone_format
  check (phone is null or phone ~ '^(\+62|62|0)8[0-9]{7,12}$');

-- Jadikan alamat utama secara atomik.
-- SECURITY INVOKER (default): RLS addresses tetap berlaku, jadi hanya baris milik sendiri.
create or replace function public.set_default_address(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from public.addresses where id = p_id and user_id = v_uid) then
    raise exception 'ADDRESS_NOT_FOUND';
  end if;
  update public.addresses set is_default = false where user_id = v_uid and is_default;
  update public.addresses set is_default = true where id = p_id and user_id = v_uid;
end;
$$;

-- Hapus alamat; jika yang dihapus adalah alamat utama, alamat terbaru lain dijadikan utama.
create or replace function public.delete_address(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_was_default boolean;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  delete from public.addresses where id = p_id and user_id = v_uid
  returning is_default into v_was_default;
  if not found then raise exception 'ADDRESS_NOT_FOUND'; end if;

  if v_was_default then
    update public.addresses set is_default = true
     where id = (select id from public.addresses
                  where user_id = v_uid order by created_at desc limit 1);
  end if;
end;
$$;

revoke all on function public.set_default_address(uuid) from public, anon;
revoke all on function public.delete_address(uuid)      from public, anon;
grant execute on function public.set_default_address(uuid) to authenticated;
grant execute on function public.delete_address(uuid)      to authenticated;