// Om en bruker vil ha e-post for en type varsel. Kun for server-kode.
// Mangler kolonnene (SQL ikke kjørt ennå) eller brukeren, er svaret «ja», som før.
import { supabase } from "@/lib/supabase";

export type NotifyKind = "notify_shares" | "notify_mentions";

export async function wantsEmail(kind: NotifyKind, by: { email?: string; id?: string }): Promise<boolean> {
  let query = supabase.from("users").select(kind);
  if (by.id) query = query.eq("id", by.id);
  else if (by.email) query = query.eq("email", by.email);
  else return true;
  const { data, error } = await query.maybeSingle();
  if (error || !data) return true;
  return (data as Record<string, unknown>)[kind] !== false;
}
