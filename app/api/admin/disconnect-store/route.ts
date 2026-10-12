import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
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

  // Fjern butikkens produkter fra søket med en gang.
  revalidateTag("products", { expire: 0 });

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
