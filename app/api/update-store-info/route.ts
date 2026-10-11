import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";

export async function POST(request: Request) {
  const shop = await getSessionShop();
  if (!shop) return notLoggedIn();

  const { displayName, contactEmail } = await request.json();

  const { error } = await supabase
    .from("stores")
    .update({
      display_name: typeof displayName === "string" && displayName.trim() ? displayName.trim() : null,
      contact_email: typeof contactEmail === "string" && contactEmail.trim() ? contactEmail.trim() : null,
    })
    .eq("store_domain", shop);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
