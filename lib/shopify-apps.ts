// Scavenger har to Shopify-apper (kun server):
// - hovedappen (SHOPIFY_CLIENT_ID/SECRET), den offentlige appen nye butikker installerer
// - den gamle appen (SHOPIFY_LEGACY_CLIENT_ID/SECRET), som butikker koblet til før den offentlige
//   appen ble godkjent fortsatt bruker til innlogging.
import { supabase } from "./supabase";

export type ShopifyApp = { clientId: string; clientSecret: string };

function app(id?: string, secret?: string): ShopifyApp | null {
  return id && secret ? { clientId: id, clientSecret: secret } : null;
}

export function mainApp(): ShopifyApp | null {
  return app(process.env.SHOPIFY_CLIENT_ID, process.env.SHOPIFY_CLIENT_SECRET);
}

export function legacyApp(): ShopifyApp | null {
  return app(process.env.SHOPIFY_LEGACY_CLIENT_ID, process.env.SHOPIFY_LEGACY_CLIENT_SECRET);
}

export function allApps(): ShopifyApp[] {
  return [mainApp(), legacyApp()].filter((a): a is ShopifyApp => !!a);
}

export function appByClientId(clientId: string | undefined | null): ShopifyApp | null {
  return allApps().find((a) => a.clientId === clientId) ?? null;
}

// Butikker som er koblet til med den gamle appen, logger inn med den. Alle andre bruker hovedappen.
export async function appForShop(shop: string): Promise<ShopifyApp | null> {
  const legacy = legacyApp();
  if (legacy) {
    const { data } = await supabase.from("stores").select("client_id").eq("store_domain", shop).maybeSingle();
    if (data?.client_id === legacy.clientId) return legacy;
  }
  return mainApp() ?? legacy;
}
