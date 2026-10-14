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

// Butikker som allerede er koblet til, men ikke med hovedappen, logger inn med den gamle appen.
// Nye butikker bruker hovedappen.
export async function appForShop(shop: string): Promise<ShopifyApp | null> {
  const main = mainApp();
  const legacy = legacyApp();
  if (legacy) {
    const { data } = await supabase.from("stores").select("client_id").eq("store_domain", shop).maybeSingle();
    if (data && data.client_id !== main?.clientId) return legacy;
  }
  return main ?? legacy;
}
