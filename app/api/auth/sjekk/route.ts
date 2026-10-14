import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { appForShop, legacyApp, mainApp } from "@/lib/shopify-apps";

// MIDLERTIDIG feilsøking av butikkinnlogging. Viser bare ja/nei, ingen hemmeligheter.
export async function GET(req: NextRequest) {
  const shop = (req.nextUrl.searchParams.get("shop") || "").toLowerCase();
  const main = mainApp();
  const legacy = legacyApp();
  const { data, error } = await supabase.from("stores").select("client_id").eq("store_domain", shop).maybeSingle();
  const chosen = await appForShop(shop);
  return NextResponse.json({
    hovedappSattOpp: !!main,
    gammelAppSattOpp: !!legacy,
    gammelAppLikHovedapp: !!main && !!legacy && main.clientId === legacy.clientId,
    butikkFunnet: !!data,
    databaseFeil: error?.message ?? null,
    butikkBrukerHovedapp: !!data && data.client_id === main?.clientId,
    butikkBrukerGammelApp: !!data && data.client_id === legacy?.clientId,
    valgtApp: chosen === legacy && legacy ? "gammel" : chosen === main && main ? "hovedapp" : "ingen",
  });
}
