import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";

export async function POST(request: Request) {
  const shop = await getSessionShop();
  if (!shop) return notLoggedIn();

  const { displayName, contactEmail } = await request.json();
  const name = typeof displayName === "string" ? displayName.trim().slice(0, 60) : "";
  if (name.length < 2) {
    return NextResponse.json({ error: "Skriv inn navnet på butikken." }, { status: 400 });
  }

  // Kontakt-e-post endres bare når den sendes med (navnesteget sender bare navnet).
  const update: Record<string, string | null> = { display_name: name };
  if (contactEmail !== undefined) {
    update.contact_email = typeof contactEmail === "string" && contactEmail.trim() ? contactEmail.trim() : null;
  }
  const { error } = await supabase.from("stores").update(update).eq("store_domain", shop);
  revalidateTag("products", { expire: 0 });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
