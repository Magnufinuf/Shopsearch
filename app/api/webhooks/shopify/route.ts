import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { safeEqual } from "@/lib/session";

// Varsler fra Shopify: når en butikk avinstallerer appen, og personvern-varslene
// som alle offentlige Shopify-apper må håndtere (customers/data_request,
// customers/redact, shop/redact).
//
// Adresse å legge inn hos Shopify: https://scavengers.shop/api/webhooks/shopify

function isFromShopify(rawBody: string, hmacHeader: string | null): boolean {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret || !hmacHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return safeEqual(hmacHeader, expected);
}

async function forgetStoreConnection(shop: string) {
  await supabase.from("stores").delete().eq("store_domain", shop);
  revalidateTag("products", { expire: 0 });
}

// Sletter alt Scavenger har lagret om butikken.
async function deleteAllStoreData(shop: string) {
  await Promise.all([
    supabase.from("adverts").delete().eq("store_domain", shop),
    supabase.from("hidden_products").delete().eq("store_domain", shop),
    supabase.from("product_clicks").delete().eq("store_domain", shop),
  ]);
  await forgetStoreConnection(shop);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!isFromShopify(rawBody, request.headers.get("x-shopify-hmac-sha256"))) {
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic");
  let payload: { shop_domain?: string } = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {}
  const shop = (request.headers.get("x-shopify-shop-domain") || payload.shop_domain || "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) return NextResponse.json({ ok: true });

  switch (topic) {
    case "app/uninstalled":
      // Tilgangen er borte: slutt å hente produkter fra butikken.
      await forgetStoreConnection(shop);
      break;
    case "shop/redact":
      // Sendes 48 timer etter avinstallering: slett alt om butikken.
      await deleteAllStoreData(shop);
      break;
    case "customers/data_request":
    case "customers/redact":
      // Scavenger lagrer ingen kundedata fra butikkene (bare produkter), så det er ingenting å sende eller slette.
      break;
  }

  return NextResponse.json({ ok: true });
}
