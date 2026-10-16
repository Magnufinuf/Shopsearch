import { allApps } from "@/lib/shopify-apps";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop } from "@/lib/session";
import { getFreePeriod } from "@/lib/pricing";

// Hvem er logget inn, og hvilken plan har de?
export async function GET() {
  const shop = await getSessionShop();
  const freePeriod = getFreePeriod();
  const shopifyEnabled = allApps().length > 0;

  if (!shop) {
    return NextResponse.json({ loggedIn: false, shop: null, displayName: null, subscribed: false, shopifyEnabled, ...freePeriod });
  }

  const { data } = await supabase
    .from("stores")
    .select("*")
    .eq("store_domain", shop)
    .maybeSingle();

  // Butikken kan ha blitt koblet fra etter at cookien ble laget.
  if (!data) {
    return NextResponse.json({ loggedIn: false, shop: null, displayName: null, subscribed: false, shopifyEnabled, ...freePeriod });
  }

  return NextResponse.json({
    loggedIn: true,
    shop,
    // Et navn som bare er myshopify-adressen regnes som ikke valgt.
    displayName: data.display_name && data.display_name !== shop.replace(".myshopify.com", "") ? data.display_name : null,
    subscribed: !!data.subscribed,
    logoUrl: data.logo_url || null,
    // false før logo-kolonnen finnes; da kreves ikke logo.
    logoSupported: "logo_url" in data,
    shopifyEnabled,
    ...freePeriod,
  });
}
