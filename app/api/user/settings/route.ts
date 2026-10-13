import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";

// Varselvalg for innlogget bruker.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Ikke logget inn." }, { status: 401 });

  const { data, error } = await supabase.from("users").select("notify_shares, notify_mentions").eq("id", userId).maybeSingle();
  // Før SQL-en er kjørt finnes ikke kolonnene: vis standard (på) og si fra.
  if (error) return NextResponse.json({ notifyShares: true, notifyMentions: true, ready: false });
  return NextResponse.json({
    notifyShares: data?.notify_shares !== false,
    notifyMentions: data?.notify_mentions !== false,
    ready: true,
  });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Ikke logget inn." }, { status: 401 });

  const body = await request.json();
  const update: Record<string, boolean> = {};
  if (typeof body.notifyShares === "boolean") update.notify_shares = body.notifyShares;
  if (typeof body.notifyMentions === "boolean") update.notify_mentions = body.notifyMentions;
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Ingenting å lagre." }, { status: 400 });

  const { error } = await supabase.from("users").update(update).eq("id", userId);
  if (error) return NextResponse.json({ error: "Kunne ikke lagre. Er varsler satt opp i databasen?" }, { status: 500 });
  return NextResponse.json({ success: true });
}
