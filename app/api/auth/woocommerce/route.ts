import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { setSessionCookie } from "@/lib/session";
import { WooError, normalizeWooDomain, wooGet } from "@/lib/woocommerce";

// Kobler til en WooCommerce-butikk med en lesenøkkel. Bare en administrator i butikken kan lage nøkkelen,
// så en nøkkel som virker viser at det er eieren som kobler til.
export async function POST(request: Request) {
  const { storeUrl, consumerKey, consumerSecret } = await request.json().catch(() => ({}));
  const domain = normalizeWooDomain(String(storeUrl || ""));
  const key = String(consumerKey || "").trim();
  const secret = String(consumerSecret || "").trim();

  if (!domain) return NextResponse.json({ error: "Skriv inn adressen til nettbutikken, f.eks. dinbutikk.no." }, { status: 400 });
  if (!/^ck_[a-f0-9]{20,}$/i.test(key) || !/^cs_[a-f0-9]{20,}$/i.test(secret)) {
    return NextResponse.json({ error: "Nøklene ser feil ut. Consumer key starter med ck_ og consumer secret med cs_." }, { status: 400 });
  }

  try {
    await wooGet(domain, key, secret, "wc/v3/products", { per_page: "1" });
  } catch (err) {
    const status = err instanceof WooError ? err.status : 0;
    const message =
      status === 401 || status === 403
        ? "WooCommerce godtok ikke nøklene. Sjekk at du kopierte begge, og at nøkkelen har lesetilgang."
        : status === 404
          ? "Fant ikke WooCommerce på den adressen. Sjekk at adressen er riktig."
          : "Fikk ikke kontakt med nettbutikken. Prøv igjen om litt.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { data: existing } = await supabase.from("stores").select("display_name").eq("store_domain", domain).maybeSingle();
  const { error } = await supabase.from("stores").upsert(
    { store_domain: domain, client_id: key, client_secret: secret, display_name: existing?.display_name ?? null },
    { onConflict: "store_domain" }
  );
  if (error) return NextResponse.json({ error: "Noe gikk galt, prøv igjen." }, { status: 500 });
  revalidateTag("products", { expire: 0 });

  const response = NextResponse.json({ success: true, next: existing?.display_name ? "/admin" : "/bedrift-navn?neste=/registrer/suksess" });
  setSessionCookie(response, domain);
  return response;
}
