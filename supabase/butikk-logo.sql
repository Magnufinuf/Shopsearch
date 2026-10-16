-- Logo (profilbilde) for butikker. Kjør én gang i Supabase SQL Editor.
alter table stores add column if not exists logo_url text;
