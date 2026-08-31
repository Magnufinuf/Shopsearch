import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop || !shop.endsWith(".myshopify.com")) {
    return NextResponse.json({ error: "Ugyldig butikkdomene" }, { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://shopsearch-gamma.vercel.app";
  const redirectUri = `${appUrl}/api/auth/callback`;
  const state = Math.random().toString(36).slice(2);
  const scope = "read_products";

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return NextResponse.redirect(installUrl);
}
