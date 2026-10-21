-- Produkter brukere har lagret med hjertet. Kjør én gang i Supabase SQL Editor.
create table if not exists saved_products (
  user_id uuid not null references users (id) on delete cascade,
  product_key text not null,
  product jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_key)
);
alter table saved_products enable row level security;
