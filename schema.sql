create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  store_domain text unique not null,
  client_id text not null,
  client_secret text not null,
  display_name text,
  created_at timestamp with time zone default now()
);
