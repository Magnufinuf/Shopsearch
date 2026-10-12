-- Kommentarer på annonser.
-- Kjør i Supabase: SQL Editor -> New query -> lim inn -> Run.

create table if not exists advert_comments (
  id bigint generated always as identity primary key,
  advert_id bigint not null references adverts (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists advert_comments_advert_idx on advert_comments (advert_id, created_at desc);
create index if not exists advert_comments_user_idx on advert_comments (user_id, created_at desc);

alter table advert_comments enable row level security;
