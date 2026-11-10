// Tilgangsnøkler til Shopify-butikker (kun server).
// Nye offentlige apper må bruke nøkler som utløper etter en time; de fornyes med en refresh token
// (gyldig i 90 dager, byttes ut hver gang den brukes). Den gamle appen bruker nøkler som ikke utløper.
import { supabase } from "./supabase";
import { ShopifyApp, appByClientId } from "./shopify-apps";

export type TokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null; // ISO-tid, null = utløper ikke
  refreshExpiresAt: string | null;
};

export class ShopifyTokenError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function inSeconds(seconds: unknown): string | null {
  return typeof seconds === "number" && seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null;
}

async function requestToken(shop: string, app: ShopifyApp, params: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: app.clientId, client_secret: app.clientSecret, ...params }),
    cache: "no-store",
  });
  if (!res.ok) throw new ShopifyTokenError(res.status, `Shopify-token for ${shop} feilet (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) throw new ShopifyTokenError(res.status, `Shopify-token for ${shop}: svaret mangler access_token`);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: inSeconds(data.expires_in),
    refreshExpiresAt: inSeconds(data.refresh_token_expires_in),
  };
}

// Bytter koden fra installasjonen/innloggingen mot en nøkkel. expiring = utløpende nøkkel (påkrevd for offentlige apper).
export function exchangeCode(shop: string, app: ShopifyApp, code: string, expiring: boolean) {
  return requestToken(shop, app, { code, ...(expiring ? { expiring: "1" } : {}) });
}

// Kolonnene for utløpende nøkler (supabase/shopify-tokens.sql).
export function tokenColumns(t: TokenSet) {
  return { client_secret: t.accessToken, refresh_token: t.refreshToken, token_expires_at: t.expiresAt, refresh_expires_at: t.refreshExpiresAt };
}

export function isMissingTokenColumns(message: string) {
  return /refresh_token|token_expires_at|refresh_expires_at/i.test(message);
}

type StoreRow = {
  store_domain: string;
  client_id: string;
  client_secret: string;
  refresh_token?: string | null;
  token_expires_at?: string | null;
};

const REFRESH_MARGIN_MS = 5 * 60 * 1000;
// Samme butikk fornyes bare én gang om gangen (refresh tokenen kan bare brukes én gang).
const refreshing = new Map<string, Promise<string>>();

// Gyldig nøkkel for butikken. Utløper den snart, fornyes den og lagres.
export async function getStoreToken(store: StoreRow): Promise<string> {
  const expiresAt = store.token_expires_at ? new Date(store.token_expires_at).getTime() : null;
  if (!expiresAt || !store.refresh_token || expiresAt - Date.now() > REFRESH_MARGIN_MS) return store.client_secret;

  const pending = refreshing.get(store.store_domain);
  if (pending) return pending;

  const job = (async () => {
    const app = appByClientId(store.client_id);
    if (!app) return store.client_secret;
    try {
      const t = await requestToken(store.store_domain, app, { grant_type: "refresh_token", refresh_token: store.refresh_token! });
      const { error } = await supabase.from("stores").update(tokenColumns(t)).eq("store_domain", store.store_domain);
      if (error) console.error(`Kunne ikke lagre ny Shopify-nøkkel for ${store.store_domain}:`, error.message);
      return t.accessToken;
    } catch (err) {
      console.error(`Kunne ikke fornye Shopify-nøkkelen for ${store.store_domain}:`, err);
      return store.client_secret;
    }
  })().finally(() => refreshing.delete(store.store_domain));
  refreshing.set(store.store_domain, job);
  return job;
}
