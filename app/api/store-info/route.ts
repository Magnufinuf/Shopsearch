import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";

export async function POST() {
  const storeDomain = await getSessionShop();
  if (!storeDomain) return notLoggedIn();

  const { data, error } = await supabase
    .from("stores")
    .select("display_name, contact_email")
    .eq("store_domain", storeDomain)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    displayName: data?.display_name || "",
    contactEmail: data?.contact_email || "",
  });
}
