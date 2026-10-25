-- Prisvarsel: e-post når et lagret produkt blir billigere (Innstillinger -> Varsler).
-- Kjør én gang i Supabase: SQL Editor -> New query -> lim inn -> Run. Trygt å kjøre flere ganger.
-- Sist varslede pris lagres i saved_products.product (jsonb, feltet "price"), så ingen andre endringer trengs.
alter table users add column if not exists notify_price_drops boolean not null default true;
