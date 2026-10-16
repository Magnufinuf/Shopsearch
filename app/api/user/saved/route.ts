import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";
import { fallbackStoreName, getStoreNames } from "@/lib/store-names";

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

  const adverts = (data || []).map((row) => row.adverts as unknown as { store_domain: string } | null).filter((a) => !!a) as { store_domain: string }[];
  const names = await getStoreNames(adverts.map((a) => a.store_domain));
  return NextResponse.json({
    adverts: adverts.map((a) => ({ ...a, store_name: names.get(a.store_domain) || fallbackStoreName(a.store_domain) })),
  });
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
