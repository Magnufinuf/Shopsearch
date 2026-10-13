-- Kategori og produkt på annonser. Kjør én gang i Supabase SQL Editor.
alter table adverts add column if not exists category text;
alter table adverts add column if not exists product_url text;
alter table adverts add column if not exists product_title text;
