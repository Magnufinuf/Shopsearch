import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";

const notLoggedIn = () => NextResponse.json({ error: "Logg inn for å lagre annonser." }, { status: 401 });

// Lagrede annonser for innlogget bruker, nyeste først.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return notLoggedIn();

  const { data, error } = await supabase
    .from("saved_adverts")
    .select("created_at, adverts (*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ adverts: (data || []).map((row) => row.adverts).filter(Boolean) });
}

// { advertId, saved: true } lagrer, { advertId, saved: false } fjerner.
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return notLoggedIn();

  const { advertId, saved } = await request.json();
  if (!advertId) return NextResponse.json({ error: "Mangler advertId" }, { status: 400 });

  const { error } = saved
    ? await supabase.from("saved_adverts").upsert({ user_id: userId, advert_id: advertId })
    : await supabase.from("saved_adverts").delete().eq("user_id", userId).eq("advert_id", advertId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
