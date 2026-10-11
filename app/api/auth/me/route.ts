import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop } from "@/lib/session";
import { getFreePeriod } from "@/lib/pricing";

// Hvem er logget inn, og hvilken plan har de?
export async function GET() {
  const shop = await getSessionShop();
  const freePeriod = getFreePeriod();

  if (!shop) {
    return NextResponse.json({ loggedIn: false, shop: null, subscribed: false, ...freePeriod });
  }

  const { data } = await supabase
    .from("stores")
    .select("store_domain, subscribed")
    .eq("store_domain", shop)
    .maybeSingle();

  // Butikken kan ha blitt koblet fra etter at cookien ble laget.
  if (!data) {
    return NextResponse.json({ loggedIn: false, shop: null, subscribed: false, ...freePeriod });
  }

  return NextResponse.json({ loggedIn: true, shop, subscribed: !!data.subscribed, ...freePeriod });
}
