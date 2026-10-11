import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ loggedIn: false, email: null, savedIds: [] });

  const [{ data: user }, { data: saved }] = await Promise.all([
    supabase.from("users").select("email").eq("id", userId).maybeSingle(),
    supabase.from("saved_adverts").select("advert_id").eq("user_id", userId),
  ]);

  if (!user) return NextResponse.json({ loggedIn: false, email: null, savedIds: [] });

  return NextResponse.json({
    loggedIn: true,
    email: user.email,
    savedIds: (saved || []).map((s) => String(s.advert_id)),
  });
}
