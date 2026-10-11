import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { normalizeDomain, setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { storeDomain, clientId, clientSecret, displayName } = await req.json();

    if (!storeDomain || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Manglende felter" }, { status: 400 });
    }

    const domain = normalizeDomain(storeDomain);
    const { error } = await supabase.from("stores").insert({
      store_domain: domain,
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      display_name: displayName?.trim() || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Logg butikken inn med en gang, så de slipper å gjøre det selv.
    const response = NextResponse.json({ success: true });
    setSessionCookie(response, domain);
    return response;
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
