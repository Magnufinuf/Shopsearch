-- Brukerkontoer for vanlige besøkende (ikke bedrifter).
-- Kjør hele denne filen i Supabase: SQL Editor -> New query -> lim inn -> Run.
-- VIKTIG: Legg inn SUPABASE_SECRET_KEY i Vercel FØR du kjører denne (se nederst).

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists login_codes (
  id bigint generated always as identity primary key,
  email text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists login_codes_email_idx on login_codes (email);

create table if not exists saved_adverts (
  user_id uuid not null references users (id) on delete cascade,
  advert_id bigint not null references adverts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, advert_id)
);

-- Lås alle tabellene: bare serveren (med den hemmelige nøkkelen) kommer til.
-- Før dette kunne hvem som helst med den offentlige nøkkelen lese f.eks. butikkenes Shopify-nøkler.
alter table users enable row level security;
alter table login_codes enable row level security;
alter table saved_adverts enable row level security;
alter table stores enable row level security;
alter table hidden_products enable row level security;
alter table adverts enable row level security;
alter table messages enable row level security;
