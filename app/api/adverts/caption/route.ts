import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";

// Butikken endrer teksten på en av sine egne annonser.
export async function POST(request: Request) {
  const storeDomain = await getSessionShop();
  if (!storeDomain) return notLoggedIn();
  const { id, caption } = await request.json();
  if (!id || typeof caption !== "string") {
    return NextResponse.json({ error: "Ugyldig tekst" }, { status: 400 });
  }

  const { error } = await supabase
    .from("adverts")
    .update({ caption: caption.trim().slice(0, 500) })
    .eq("id", id)
    .eq("store_domain", storeDomain);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
