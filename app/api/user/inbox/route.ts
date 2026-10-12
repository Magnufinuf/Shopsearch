import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";

async function currentEmail(): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const { data } = await supabase.from("users").select("email").eq("id", userId).maybeSingle();
  return data?.email ?? null;
}

// Annonser andre har sendt til meg, nyeste først.
export async function GET() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Ikke logget inn." }, { status: 401 });

  const { data, error } = await supabase
    .from("shared_adverts")
    .select("id, message, seen_at, created_at, users!shared_adverts_from_user_fkey (username), adverts (*)")
    .eq("to_email", email)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data || [])
    .filter((row) => row.adverts)
    .map((row) => ({
      id: String(row.id),
      message: row.message,
      seen: !!row.seen_at,
      createdAt: row.created_at,
      from: (row.users as unknown as { username: string | null } | null)?.username ?? null,
      advert: row.adverts,
    }));

  return NextResponse.json({ items });
}

// Markerer alt i innboksen som sett.
export async function POST() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Ikke logget inn." }, { status: 401 });

  await supabase
    .from("shared_adverts")
    .update({ seen_at: new Date().toISOString() })
    .eq("to_email", email)
    .is("seen_at", null);

  return NextResponse.json({ success: true });
}
