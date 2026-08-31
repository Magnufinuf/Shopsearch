import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { storeDomain, clientId, clientSecret, displayName } = await req.json();

    if (!storeDomain || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Manglende felter" }, { status: 400 });
    }

    const { error } = await supabase.from("stores").insert({
      store_domain: storeDomain.trim(),
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      display_name: displayName?.trim() || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from("stores")
    .select("store_domain, display_name, created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stores: data });
}
