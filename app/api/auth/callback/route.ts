import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const code = req.nextUrl.searchParams.get("code");

  if (!shop || !code) {
    return NextResponse.json({ error: "Mangler shop eller code" }, { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID!;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!;

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
  return NextResponse.redirect(`${appUrl}/registrer/suksess`);
}
