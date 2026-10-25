import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { setSessionCookie } from "@/lib/session";
import { WIX_PREFIX, WixError, fetchWixRaw, parseWixSiteId, wixStoreDomain } from "@/lib/wix";

// Kobler til (eller logger inn) en Wix-butikk med en API-nøkkel. Bare eieren av Wix-kontoen kan lage nøkkelen,
// så en nøkkel som virker for nettstedet viser at det er eieren som kobler til.
export const maxDuration = 30;

export async function POST(request: Request) {
  const { siteLink, apiKey: rawKey } = await request.json().catch(() => ({}));
  const siteId = parseWixSiteId(String(siteLink || ""));
  const apiKey = String(rawKey || "").trim();

  if (!siteId) {
    return NextResponse.json({ error: "Fant ikke nettstedet i lenken. Kopier hele adressen fra kontrollpanelet i Wix." }, { status: 400 });
  }
  if (apiKey.length < 20 || apiKey.length > 5000 || /\s/.test(apiKey)) {
    return NextResponse.json({ error: "API-nøkkelen ser feil ut. Kopier hele nøkkelen fra Wix." }, { status: 400 });
  }

  let products;
  try {
    products = await fetchWixRaw(siteId, apiKey);
  } catch (err) {
    const status = err instanceof WixError ? err.status : 0;
    const message =
      status === 401 || status === 403
        ? "Wix godtok ikke nøkkelen. Sjekk at den har tilgang til Wix Stores og til dette nettstedet."
        : status === 404
          ? "Fant ingen nettbutikk på nettstedet. Sjekk at Wix Stores er lagt til."
          : "Fikk ikke kontakt med Wix. Prøv igjen om litt.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Samme nettsted kan ha fått nytt domene siden sist: bruk det vi har fra før.
  const clientId = `${WIX_PREFIX}${siteId}`;
  const { data: existing } = await supabase.from("stores").select("store_domain, display_name").eq("client_id", clientId).maybeSingle();
  const domain = existing?.store_domain || products.map((p) => wixStoreDomain(p.url)).find(Boolean);
  if (!domain) {
    return NextResponse.json({ error: "Fant ingen synlige produkter. Legg ut minst ett produkt i nettbutikken først." }, { status: 400 });
  }

  // Et domene som allerede brukes av en annen butikk (f.eks. Shopify eller WooCommerce) skal ikke overskrives.
  if (!existing) {
    const { data: taken } = await supabase.from("stores").select("client_id").eq("store_domain", domain).maybeSingle();
    if (taken && taken.client_id !== clientId) {
      return NextResponse.json({ error: "Denne nettbutikken er allerede koblet til Scavenger på en annen måte." }, { status: 400 });
    }
  }

  const { error } = await supabase.from("stores").upsert(
    { store_domain: domain, client_id: clientId, client_secret: apiKey, display_name: existing?.display_name ?? null },
    { onConflict: "store_domain" }
  );
  if (error) return NextResponse.json({ error: "Noe gikk galt, prøv igjen." }, { status: 500 });
  revalidateTag("products", { expire: 0 });

  const response = NextResponse.json({ success: true, next: existing?.display_name ? "/admin" : "/bedrift-navn?neste=/registrer/suksess" });
  setSessionCookie(response, domain);
  return response;
}
