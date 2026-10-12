-- Brukernavn, så man kan sende annonser til @brukernavn i stedet for e-post.
-- Kjør i Supabase: SQL Editor -> New query -> lim inn -> Run.

alter table users add column if not exists username text;
create unique index if not exists users_username_idx on users (username);
