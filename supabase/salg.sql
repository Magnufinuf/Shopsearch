-- Salg Scavenger har sendt butikkene (for 4 % provisjon). Kjør én gang i Supabase:
-- SQL Editor -> New query -> lim inn -> Run. Trygt å kjøre flere ganger.

-- Kjøp meldt fra Scavenger-pikselen (butikker som ikke er på Shopify eller WooCommerce).
create table if not exists scavenger_sales (
  id bigint generated always as identity primary key,
  store_domain text not null,
  order_id text not null,
  amount numeric not null,
  currency text not null default 'NOK',
  created_at timestamptz not null default now(),
  unique (store_domain, order_id)
);
create index if not exists scavenger_sales_store_idx on scavenger_sales (store_domain, created_at desc);
alter table scavenger_sales enable row level security;

-- Fakturaene for provisjon, så ingen butikk faktureres to ganger for samme måned.
create table if not exists commission_invoices (
  id bigint generated always as identity primary key,
  store_domain text not null,
  month text not null,
  sales_nok numeric not null,
  commission_nok numeric not null,
  stripe_invoice_id text,
  created_at timestamptz not null default now(),
  unique (store_domain, month)
);
alter table commission_invoices enable row level security;
