// Salg Scavenger har sendt en butikk (kun server). Grunnlaget for 4 % provisjon.
// Lenkene våre merkes med utm_source=shopsearch (se withTracking i ProductCard), og det kjenner vi igjen her:
// - Shopify: ordrens landing_site (krever tilgang til ordrer i appen)
// - WooCommerce: ordreattribusjonen WooCommerce lagrer selv (lesenøkkelen kan lese ordrer)
// - alle andre: Scavenger-pikselen på butikkens «takk for kjøpet»-side (tabellen scavenger_sales)
import { supabase } from "./supabase";
import { SHOPIFY_API_VERSION } from "./shopify";
import { getStoreToken } from "./shopify-token";
import { isShopifyDomain, wooGet } from "./woocommerce";
import { isWixStore } from "./wix";
import { fetchRate } from "./exchange";

export const COMMISSION_RATE = 0.04;
const TRACKING_MARK = "shopsearch";

export type Sale = { id: string; amount: number; currency: string };
export type SalesResult = { source: "shopify" | "woocommerce" | "pixel"; available: boolean; sales: Sale[] };

type StoreRow = {
  store_domain: string;
  client_id: string;
  client_secret: string;
  refresh_token?: string | null;
  token_expires_at?: string | null;
};

async function shopifySales(store: StoreRow, from: Date, to: Date): Promise<SalesResult> {
  const token = await getStoreToken(store);
  const sales: Sale[] = [];
  let url: string | null =
    `https://${store.store_domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&limit=250` +
    `&created_at_min=${from.toISOString()}&created_at_max=${to.toISOString()}&fields=id,total_price,currency,landing_site,referring_site,cancelled_at`;
  for (let page = 0; url && page < 20; page++) {
    const res: Response = await fetch(url, { headers: { "X-Shopify-Access-Token": token }, cache: "no-store" });
    if (res.status === 401 || res.status === 403) return { source: "shopify", available: false, sales: [] };
    if (!res.ok) throw new Error(`Shopify-ordrer for ${store.store_domain} svarte ${res.status}`);
    const data = await res.json();
    for (const o of data.orders || []) {
      const text = `${o.landing_site || ""} ${o.referring_site || ""}`.toLowerCase();
      if (!o.cancelled_at && text.includes(TRACKING_MARK)) sales.push({ id: String(o.id), amount: parseFloat(o.total_price) || 0, currency: o.currency || "NOK" });
    }
    url = res.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
  }
  return { source: "shopify", available: true, sales };
}

type WooOrder = { id: number; total: string; currency: string; meta_data?: { key: string; value: unknown }[] };

async function wooSales(store: StoreRow, from: Date, to: Date): Promise<SalesResult> {
  const sales: Sale[] = [];
  for (let page = 1; page <= 30; page++) {
    let res: Response;
    try {
      res = await wooGet(store.store_domain, store.client_id, store.client_secret, "wc/v3/orders", {
        after: from.toISOString(),
        before: to.toISOString(),
        status: "processing,completed",
        per_page: "100",
        page: String(page),
      });
    } catch {
      return { source: "woocommerce", available: false, sales };
    }
    const orders = (await res.json()) as WooOrder[];
    for (const o of orders) {
      const meta = Object.fromEntries((o.meta_data || []).map((m) => [m.key, String(m.value ?? "")]));
      const source = (meta._wc_order_attribution_utm_source || "").toLowerCase();
      const referrer = (meta._wc_order_attribution_referrer || meta._wc_order_attribution_session_entry || "").toLowerCase();
      if (source === TRACKING_MARK || referrer.includes("scavengers.shop") || referrer.includes(`utm_source=${TRACKING_MARK}`)) {
        sales.push({ id: String(o.id), amount: parseFloat(o.total) || 0, currency: o.currency || "NOK" });
      }
    }
    if (orders.length < 100) break;
  }
  return { source: "woocommerce", available: true, sales };
}

async function pixelSales(store: StoreRow, from: Date, to: Date): Promise<SalesResult> {
  const { data, error } = await supabase
    .from("scavenger_sales")
    .select("order_id, amount, currency")
    .eq("store_domain", store.store_domain)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .limit(10000);
  if (error) return { source: "pixel", available: false, sales: [] };
  return {
    source: "pixel",
    available: true,
    sales: (data || []).map((r) => ({ id: String(r.order_id), amount: Number(r.amount) || 0, currency: r.currency || "NOK" })),
  };
}

export function salesSource(store: StoreRow): SalesResult["source"] {
  if (isShopifyDomain(store.store_domain)) return "shopify";
  if (!isWixStore(store.client_id) && !/^(feed|site):/.test(store.client_id || "")) return "woocommerce";
  return "pixel";
}

export async function salesForStore(store: StoreRow, from: Date, to: Date): Promise<SalesResult> {
  const source = salesSource(store);
  if (source === "shopify") return shopifySales(store, from, to);
  if (source === "woocommerce") return wooSales(store, from, to);
  return pixelSales(store, from, to);
}

// Summen i norske kroner (kurser fra frankfurter.app). Salg i valutaer uten kurs telles ikke.
export async function totalInNok(sales: Sale[]): Promise<number> {
  const rates = new Map<string, number | null>();
  let total = 0;
  for (const s of sales) {
    const cur = (s.currency || "NOK").toUpperCase();
    if (!rates.has(cur)) rates.set(cur, await fetchRate(cur, "NOK"));
    const rate = rates.get(cur);
    if (rate) total += s.amount * rate;
  }
  return Math.round(total * 100) / 100;
}

// Første dag i måneden (UTC). offset -1 = forrige måned.
export function monthStart(date: Date, offset = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}
