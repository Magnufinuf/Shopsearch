import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { clearSessionCookie, getSessionShop, notLoggedIn } from "@/lib/session";

export async function POST() {
  const storeDomain = await getSessionShop();
  if (!storeDomain) return notLoggedIn();

  const { error } = await supabase
    .from("stores")
    .delete()
    .eq("store_domain", storeDomain);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
