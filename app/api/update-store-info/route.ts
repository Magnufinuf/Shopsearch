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
    const email = typeof contactEmail === "string" ? contactEmail.trim().toLowerCase() : "";
    if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) {
      return NextResponse.json({ error: "Skriv inn en gyldig e-postadresse." }, { status: 400 });
    }
    update.contact_email = email || null;
  }
  const { error } = await supabase.from("stores").update(update).eq("store_domain", shop);
  revalidateTag("products", { expire: 0 });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
