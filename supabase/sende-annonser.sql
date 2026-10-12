-- Sende annonser til andre brukere.
-- Kjør i Supabase: SQL Editor -> New query -> lim inn -> Run.

create table if not exists shared_adverts (
  id bigint generated always as identity primary key,
  from_user uuid not null references users (id) on delete cascade,
  to_email text not null,
  advert_id bigint not null references adverts (id) on delete cascade,
  message text,
  seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists shared_adverts_to_email_idx on shared_adverts (to_email, created_at desc);
create index if not exists shared_adverts_from_user_idx on shared_adverts (from_user, created_at desc);

alter table shared_adverts enable row level security;
