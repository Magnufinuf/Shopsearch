import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabase } from "@/lib/supabase";
import { safeEqual, setSessionCookie } from "@/lib/session";
import { APP_URL } from "@/lib/app-url";
import { revalidateTag } from "next/cache";
import { appByClientId, mainApp } from "@/lib/shopify-apps";
import { registerWebhooks } from "@/lib/shopify-webhooks";

// Sjekker at svaret faktisk kommer fra Shopify (hmac) og hører til innloggingen vi startet (state).
function isValidShopifyCallback(req: NextRequest, clientSecret: string): boolean {
  const params = req.nextUrl.searchParams;
  const hmac = params.get("hmac");
  const state = params.get("state");
  const savedState = req.cookies.get("shopify_oauth_state")?.value;
  if (!hmac || !state || !savedState || !safeEqual(state, savedState)) return false;

  const message = Array.from(params.entries())
    .filter(([key]) => key !== "hmac")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const expected = createHmac("sha256", clientSecret).update(message).digest("hex");
  return safeEqual(hmac, expected);
}

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const code = req.nextUrl.searchParams.get("code");

  if (!shop || !code || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop)) {
    return NextResponse.json({ error: "Mangler shop eller code" }, { status: 400 });
  }

  const app = appByClientId(req.cookies.get("shopify_oauth_app")?.value) ?? mainApp();
  if (!app) {
    return NextResponse.json({ error: "Shopify er ikke satt opp." }, { status: 500 });
  }
  const { clientId, clientSecret } = app;

  if (!isValidShopifyCallback(req, clientSecret)) {
    return NextResponse.json({ error: "Ugyldig svar fra Shopify, prøv igjen." }, { status: 400 });
  }

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ error: "Klarte ikke å fullføre installasjonen" }, { status: 500 });
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Navnet butikken har valgt beholdes. Mangler det, må butikken velge det før den går videre.
  const { data: existing } = await supabase.from("stores").select("*").eq("store_domain", shop).maybeSingle();
  // Logo kreves bare når logo-kolonnen finnes (supabase/butikk-logo.sql).
  const missingLogo = !!existing && "logo_url" in existing && !existing.logo_url;
  const savedName = existing?.display_name?.trim() || "";
  const displayName = savedName && savedName !== shop.replace(".myshopify.com", "") ? savedName : null;

  await supabase.from("stores").upsert(
    {
      store_domain: shop,
      client_id: clientId,
      client_secret: accessToken,
      display_name: displayName,
    },
    { onConflict: "store_domain" }
  );
  revalidateTag("products", { expire: 0 });

  // Be Shopify si fra når appen avinstalleres eller produktene endres (håndteres i /api/webhooks/shopify).
  await registerWebhooks(shop, accessToken);

  const isLogin = req.cookies.get("shopify_oauth_login")?.value === "1";
  const next = isLogin ? "/admin" : "/registrer/suksess";
  const response = NextResponse.redirect(
    displayName && !missingLogo ? `${APP_URL}${next}` : `${APP_URL}/bedrift-navn?neste=${encodeURIComponent(next)}`
  );
  response.cookies.delete("shopify_oauth_state");
  response.cookies.delete("shopify_oauth_login");
  response.cookies.delete("shopify_oauth_app");
  setSessionCookie(response, shop);
  return response;
}
