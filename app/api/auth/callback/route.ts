import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabase } from "@/lib/supabase";
import { safeEqual, setSessionCookie } from "@/lib/session";

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

  const clientId = process.env.SHOPIFY_CLIENT_ID!;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!;

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

  await supabase.from("stores").upsert(
    {
      store_domain: shop,
      client_id: clientId,
      client_secret: accessToken,
      display_name: shop.replace(".myshopify.com", ""),
    },
    { onConflict: "store_domain" }
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://shopsearch-gamma.vercel.app";
  const isLogin = req.cookies.get("shopify_oauth_login")?.value === "1";
  const response = NextResponse.redirect(`${appUrl}${isLogin ? "/admin" : "/registrer/suksess"}`);
  response.cookies.delete("shopify_oauth_state");
  response.cookies.delete("shopify_oauth_login");
  setSessionCookie(response, shop);
  return response;
}
