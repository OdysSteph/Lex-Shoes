alter table public.store_settings
  add column instagram_url text,
  add column facebook_url  text,
  add column tiktok_url    text,
  add column whatsapp_number text,
  add constraint store_instagram_chk check (instagram_url is null or instagram_url ~ '^https://'),
  add constraint store_facebook_chk  check (facebook_url  is null or facebook_url  ~ '^https://'),
  add constraint store_tiktok_chk    check (tiktok_url    is null or tiktok_url    ~ '^https://'),
  add constraint store_whatsapp_chk  check (whatsapp_number is null or whatsapp_number ~ '^62[0-9]{8,13}$');