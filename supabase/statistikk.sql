-- Besøk Scavenger sender til butikkene (klikk på produkter og «Kjøp» på annonser).
-- Kjør i Supabase: SQL Editor -> New query -> lim inn -> Run.
create table if not exists product_clicks (
  id bigint generated always as identity primary key,
  store_domain text not null,
  product_id text,
  source text not null default 'search',
  created_at timestamptz not null default now()
);
create index if not exists product_clicks_store_idx on product_clicks (store_domain, created_at desc);
alter table product_clicks enable row level security;
