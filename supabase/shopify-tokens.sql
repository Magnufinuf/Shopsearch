-- Utløpende Shopify-nøkler (påkrevd for offentlige Shopify-apper).
-- Kjør én gang i Supabase: SQL Editor -> New query -> lim inn -> Run. Trygt å kjøre flere ganger.
alter table stores add column if not exists refresh_token text;
alter table stores add column if not exists token_expires_at timestamptz;
alter table stores add column if not exists refresh_expires_at timestamptz;
