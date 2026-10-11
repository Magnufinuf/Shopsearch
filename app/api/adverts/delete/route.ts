import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";

export async function POST(request: Request) {
  const storeDomain = await getSessionShop();
  if (!storeDomain) return notLoggedIn();
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "Mangler id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("adverts")
    .delete()
    .eq("id", id)
    .eq("store_domain", storeDomain);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
