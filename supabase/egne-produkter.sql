-- Produkter butikker legger inn selv (når vi ikke finner dem automatisk på nettsiden).
-- Kjør én gang i Supabase: SQL Editor -> New query -> lim inn -> Run. Trygt å kjøre flere ganger.
create table if not exists manual_products (
  id bigint generated always as identity primary key,
  store_domain text not null,
  title text not null,
  price numeric not null,
  currency text not null default 'NOK',
  image_url text,
  url text not null,
  category text,
  created_at timestamptz not null default now()
);
create index if not exists manual_products_store_idx on manual_products (store_domain);
alter table manual_products enable row level security;
