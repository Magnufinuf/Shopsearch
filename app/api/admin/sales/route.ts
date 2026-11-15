import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";
import { COMMISSION_RATE, monthStart, salesForStore, salesSource, totalInNok } from "@/lib/scavenger-sales";

// Salg via Scavenger denne måneden for innlogget butikk, og hva 4 % provisjon blir.
export const maxDuration = 30;

export async function GET() {
  const shop = await getSessionShop();
  if (!shop) return notLoggedIn();
  const { data: store } = await supabase.from("stores").select("*").eq("store_domain", shop).maybeSingle();
  if (!store) return notLoggedIn();

  const now = new Date();
  try {
    const result = await salesForStore(store, monthStart(now), now);
    const totalNok = await totalInNok(result.sales);
    return NextResponse.json({
      source: result.source,
      available: result.available,
      count: result.sales.length,
      totalNok,
      commissionNok: Math.round(totalNok * COMMISSION_RATE * 100) / 100,
    });
  } catch (err) {
    console.error(`Kunne ikke hente salg for ${shop}:`, err);
    return NextResponse.json({ source: salesSource(store), available: false, count: 0, totalNok: 0, commissionNok: 0 });
  }
}
