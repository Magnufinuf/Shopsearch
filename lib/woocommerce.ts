// Kobling mot WooCommerce-butikker via REST API-et deres (kun server).
// Butikken lager en lesenøkkel (consumer key/secret) i WooCommerce og limer den inn hos oss.
import { detectStyles } from "./styles";

export function isShopifyDomain(domain: string): boolean {
  return domain.endsWith(".myshopify.com");
}

// "https://www.butikk.no/shop" -> "www.butikk.no". null hvis det ikke ser ut som en vanlig nettside.
export function normalizeWooDomain(input: string): string | null {
  let host: string;
  try {
    host = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`).hostname.toLowerCase();
  } catch {
    return null;
  }
  const looksPublic =
    /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) && !host.endsWith(".local") && !host.endsWith(".internal") && host !== "localhost";
  if (!looksPublic || isShopifyDomain(host)) return null;
  return host;
}

export class WooError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// GET mot WooCommerce. Noen servere stripper Authorization-headeren, så ved 401 prøver vi nøkkelen i adressen.
export async function wooGet(domain: string, key: string, secret: string, path: string, params: Record<string, string> = {}) {
  const url = new URL(`https://${domain}/wp-json/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const auth = "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
  let res = await fetch(url, { headers: { Authorization: auth }, cache: "no-store", redirect: "follow" });
  if (res.status === 401) {
    url.searchParams.set("consumer_key", key);
    url.searchParams.set("consumer_secret", secret);
    res = await fetch(url, { cache: "no-store", redirect: "follow" });
  }
  if (!res.ok) throw new WooError(res.status, `WooCommerce ${domain} svarte ${res.status}`);
  return res;
}

// Navnet på nettsiden (fra WordPress), brukt som forslag til butikknavn.
export async function wooSiteName(domain: string): Promise<string> {
  try {
    const res = await fetch(`https://${domain}/wp-json`, { cache: "no-store" });
    if (!res.ok) return "";
    const data = await res.json();
    return typeof data.name === "string" ? data.name.trim() : "";
  } catch {
    return "";
  }
}

type WooProduct = {
  id: number;
  name: string;
  permalink: string;
  status: string;
  catalog_visibility?: string;
  price: string;
  date_created_gmt?: string;
  description?: string;
  short_description?: string;
  categories?: { name: string }[];
  tags?: { name: string }[];
  images?: { src: string }[];
  attributes?: { name: string; options: string[] }[];
};

type WooStore = { store_domain: string; client_id: string; client_secret: string; display_name: string | null };

const PER_PAGE = 100;
const MAX_PAGES = 20;

function stripHtml(html: string | undefined): string {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

// Samme form som Shopify-produktene i lib/products.ts. failed = midlertidig feil som ikke skal mellomlagres.
export async function fetchWooProducts(store: WooStore) {
  const { store_domain: domain, client_id: key, client_secret: secret } = store;
  if (!key || !secret) return { products: [], failed: false };

  const raw: WooProduct[] = [];
  let currency = "NOK";
  let failed = false;
  try {
    try {
      const res = await wooGet(domain, key, secret, "wc/v3/settings/general/woocommerce_currency");
      const data = await res.json();
      if (typeof data.value === "string" && data.value) currency = data.value;
    } catch {
      // Valuta er ikke kritisk; NOK brukes da.
    }
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await wooGet(domain, key, secret, "wc/v3/products", { per_page: String(PER_PAGE), page: String(page), status: "publish" });
      const items = (await res.json()) as WooProduct[];
      raw.push(...items);
      const totalPages = Number(res.headers.get("x-wp-totalpages") || "1");
      if (page >= totalPages || items.length < PER_PAGE) break;
    }
  } catch (err) {
    console.error(`Kunne ikke hente produkter fra ${domain}:`, err);
    const status = err instanceof WooError ? err.status : 0;
    failed = status !== 401 && status !== 403 && status !== 404;
  }

  const products = raw
    .filter((p) => p.status === "publish" && p.catalog_visibility !== "hidden" && p.permalink)
    .map((p) => {
      const category = p.categories?.[0]?.name || "";
      const tags = (p.tags || []).map((t) => t.name);
      const description = stripHtml(`${p.short_description || ""} ${p.description || ""}`).slice(0, 500);
      return {
        id: `${domain}-${p.id}`,
        title: p.name,
        price: parseFloat(p.price || "0") || 0,
        currency,
        category,
        vendor: store.display_name || domain,
        tags,
        image: p.images?.[0]?.src ?? "",
        sizes: (p.attributes || []).flatMap((a) => a.options || []),
        url: p.permalink,
        storeDomain: domain,
        shopifyProductId: String(p.id),
        createdAt: p.date_created_gmt ? `${p.date_created_gmt}Z` : undefined,
        styles: detectStyles([p.name, category, tags.join(" "), description].join(" "), `${p.name} ${category}`),
      };
    });
  return { products, failed };
}
