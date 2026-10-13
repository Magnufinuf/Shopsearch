-- Kategori på annonser (Sko, Ytterplagg, Topper ...). Kjør én gang i Supabase SQL Editor.
alter table adverts add column if not exists category text;
