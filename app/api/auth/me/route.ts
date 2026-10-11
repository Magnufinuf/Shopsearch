import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop } from "@/lib/session";
import { getFreePeriod } from "@/lib/pricing";

// Hvem er logget inn, og hvilken plan har de?
export async function GET() {
  const shop = await getSessionShop();
  const freePeriod = getFreePeriod();
  const shopifyEnabled = !!(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET);

  if (!shop) {
    return NextResponse.json({ loggedIn: false, shop: null, displayName: null, subscribed: false, shopifyEnabled, ...freePeriod });
  }

  const { data } = await supabase
    .from("stores")
    .select("store_domain, subscribed, display_name")
    .eq("store_domain", shop)
    .maybeSingle();

  // Butikken kan ha blitt koblet fra etter at cookien ble laget.
  if (!data) {
    return NextResponse.json({ loggedIn: false, shop: null, displayName: null, subscribed: false, shopifyEnabled, ...freePeriod });
  }

  return NextResponse.json({
    loggedIn: true,
    shop,
    displayName: data.display_name || null,
    subscribed: !!data.subscribed,
    shopifyEnabled,
    ...freePeriod,
  });
}
