import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";
import { shopifyGraphQL } from "@/lib/shopify";
import { isShopifyDomain, wooSiteName } from "@/lib/woocommerce";

// Forslag til butikknavn: navnet butikken har i Shopify.
export async function GET() {
  const shop = await getSessionShop();
  if (!shop) return notLoggedIn();

  if (!isShopifyDomain(shop)) return NextResponse.json({ name: await wooSiteName(shop) });

  const { data } = await supabase.from("stores").select("client_secret").eq("store_domain", shop).maybeSingle();
  if (!data?.client_secret) return NextResponse.json({ name: "" });

  const info = await shopifyGraphQL<{ shop: { name: string } }>(shop, data.client_secret, "{ shop { name } }").catch(() => null);
  return NextResponse.json({ name: info?.shop.name?.trim() || "" });
}
