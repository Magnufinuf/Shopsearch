import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { APP_URL } from "@/lib/app-url";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop)) {
    return NextResponse.json({ error: "Ugyldig butikkdomene" }, { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!clientId || !process.env.SHOPIFY_CLIENT_SECRET) {
    return NextResponse.redirect(`${APP_URL}/logg-inn-bedrift?feil=shopify`);
  }
  const redirectUri = `${APP_URL}/api/auth/callback`;
  const state = randomBytes(16).toString("hex");
  const scope = "read_products";

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  // state lagres i en cookie og sjekkes i callback, så ingen kan forfalske svaret fra Shopify.
  const response = NextResponse.redirect(installUrl);
  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  // ?login=1: butikken er allerede koblet til og vil bare logge inn, så send dem til admin etterpå.
  if (req.nextUrl.searchParams.get("login") === "1") {
    response.cookies.set("shopify_oauth_login", "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  }
  return response;
}
