-- Valg for e-postvarsler (Innstillinger -> Varsler).
-- Kjør i Supabase: SQL Editor -> New query -> lim inn -> Run.
alter table users add column if not exists notify_shares boolean not null default true;
alter table users add column if not exists notify_mentions boolean not null default true;
