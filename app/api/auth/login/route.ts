import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { normalizeDomain, safeEqual, setSessionCookie } from "@/lib/session";

// Logg inn med butikkdomene + hemmeligheten butikken registrerte seg med.
export async function POST(request: Request) {
  const { storeDomain, secret } = await request.json();

  if (!storeDomain || !secret) {
    return NextResponse.json({ error: "Fyll inn både domene og hemmelighet." }, { status: 400 });
  }

  const domain = normalizeDomain(String(storeDomain));
  const { data } = await supabase
    .from("stores")
    .select("store_domain, client_secret")
    .eq("store_domain", domain)
    .maybeSingle();

  if (!data?.client_secret || !safeEqual(String(secret).trim(), data.client_secret)) {
    return NextResponse.json({ error: "Feil domene eller hemmelighet." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  setSessionCookie(response, data.store_domain);
  return response;
}
