import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabase } from "@/lib/supabase";
import { safeEqual, setSessionCookie } from "@/lib/session";
import { APP_URL } from "@/lib/app-url";
import { revalidateTag } from "next/cache";
import { allApps, appByClientId, mainApp } from "@/lib/shopify-apps";
import { TokenSet, exchangeCode, isMissingTokenColumns, tokenColumns } from "@/lib/shopify-token";
import { registerWebhooks } from "@/lib/shopify-webhooks";

// Sjekker at svaret faktisk kommer fra Shopify (hmac, signert med appens hemmelighet).
function hasValidHmac(req: NextRequest, clientSecret: string): boolean {
  const params = req.nextUrl.searchParams;
  const hmac = params.get("hmac");
  if (!hmac) return false;
  const message = Array.from(params.entries())
    .filter(([key]) => key !== "hmac")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const expected = createHmac("sha256", clientSecret).update(message).digest("hex");
  return safeEqual(hmac, expected);
}

// Og at svaret hører til innloggingen vi startet (state lagret i cookie).
function hasValidState(req: NextRequest): boolean {
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("shopify_oauth_state")?.value;
  return !!state && !!savedState && safeEqual(state, savedState);
}

// Feil vises som en vanlig side med «Prøv igjen», aldri som rå JSON.
function errorPage(code: string, shop?: string | null) {
  const params = new URLSearchParams({ kode: code });
  if (shop) params.set("shop", shop);
  return NextResponse.redirect(`${APP_URL}/shopify-feil?${params}`);
}

async function handleCallback(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const code = req.nextUrl.searchParams.get("code");

  if (!shop || !code || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop)) {
    console.error("Shopify-callback mangler shop eller code:", req.nextUrl.search);
    return errorPage("missing_params", shop);
  }

  // Appen fra cookien først; mangler den, den av appene som har signert svaret.
  const cookieApp = appByClientId(req.cookies.get("shopify_oauth_app")?.value);
  const app = [cookieApp, ...allApps()].find((a) => a && hasValidHmac(req, a.clientSecret)) ?? null;
  if (!app) {
    console.error(`Shopify-callback for ${shop}: ugyldig hmac (ingen app-hemmelighet stemmer)`);
    return errorPage(allApps().length ? "invalid_signature" : "not_configured", shop);
  }
  const { clientId } = app;

  // Mangler eller feil state (cookien er borte, utløpt eller fra en annen fane): start på nytt én gang.
  if (!hasValidState(req)) {
    if (req.cookies.get("shopify_oauth_retry")?.value === "1") {
      console.error(`Shopify-callback for ${shop}: state stemmer ikke etter nytt forsøk`);
      return errorPage("invalid_state", shop);
    }
    console.warn(`Shopify-callback for ${shop}: state mangler eller stemmer ikke, starter på nytt`);
    const retry = NextResponse.redirect(`${APP_URL}/api/auth/start?shop=${encodeURIComponent(shop)}`);
    retry.cookies.set("shopify_oauth_retry", "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 300 });
    return retry;
  }

  // Offentlige apper (hovedappen) må bruke nøkler som utløper; den gamle appen bruker nøkler som ikke gjør det.
  let tokens: TokenSet;
  try {
    tokens = await exchangeCode(shop, app, code, clientId === mainApp()?.clientId);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return errorPage("token", shop);
  }
  const accessToken = tokens.accessToken;

  // Navnet butikken har valgt beholdes. Mangler det, må butikken velge det før den går videre.
  const { data: existing } = await supabase.from("stores").select("*").eq("store_domain", shop).maybeSingle();
  const savedName = existing?.display_name?.trim() || "";
  const displayName = savedName && savedName !== shop.replace(".myshopify.com", "") ? savedName : null;

  const row = { store_domain: shop, client_id: clientId, display_name: displayName, ...tokenColumns(tokens) };
  let { error: saveError } = await supabase.from("stores").upsert(row, { onConflict: "store_domain" });
  // Før supabase/shopify-tokens.sql er kjørt: lagre uten kolonnene for utløpende nøkler.
  if (saveError && isMissingTokenColumns(saveError.message)) {
    console.error("Kolonnene for utløpende Shopify-nøkler mangler (kjør supabase/shopify-tokens.sql)");
    ({ error: saveError } = await supabase
      .from("stores")
      .upsert({ store_domain: shop, client_id: clientId, display_name: displayName, client_secret: accessToken }, { onConflict: "store_domain" }));
  }
  if (saveError) {
    console.error(`Kunne ikke lagre butikken ${shop}:`, saveError.message);
    return errorPage("save", shop);
  }
  revalidateTag("products", { expire: 0 });

  // Be Shopify si fra når appen avinstalleres eller produktene endres (håndteres i /api/webhooks/shopify).
  await registerWebhooks(shop, accessToken);

  const isLogin = req.cookies.get("shopify_oauth_login")?.value === "1";
  const next = isLogin ? "/admin" : "/registrer/suksess";
  const response = NextResponse.redirect(
    displayName ? `${APP_URL}${next}` : `${APP_URL}/bedrift-navn?neste=${encodeURIComponent(next)}`
  );
  response.cookies.delete("shopify_oauth_state");
  response.cookies.delete("shopify_oauth_login");
  response.cookies.delete("shopify_oauth_app");
  response.cookies.delete("shopify_oauth_retry");
  setSessionCookie(response, shop);
  return response;
}

// Uventede feil (nettverk, database) gir også feilsiden, aldri en rå 500-side.
export async function GET(req: NextRequest) {
  try {
    return await handleCallback(req);
  } catch (err) {
    console.error("Shopify-callback feilet:", err);
    return errorPage("unexpected", req.nextUrl.searchParams.get("shop"));
  }
}
