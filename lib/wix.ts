// Kobling mot Wix-butikker (Wix Stores) via REST API-et deres (kun server).
// Butikken lager en API-nøkkel med lesetilgang til Wix Stores og limer den inn hos oss sammen med lenken til nettstedet.
// Nye butikker bruker katalog V3, eldre butikker katalog V1. Vi prøver V3 først.
import { detectStyles } from "./styles";

const API = "https://www.wixapis.com";
const PAGE_SIZE = 100;
const MAX_PAGES = 20; // inntil 2000 produkter per butikk

export const WIX_PREFIX = "wix:";

export function isWixStore(clientId: string | null | undefined): boolean {
  return !!clientId?.startsWith(WIX_PREFIX);
}

// Nettstedets ID står i lenken til kontrollpanelet: manage.wix.com/dashboard/<id>/...
export function parseWixSiteId(input: string): string | null {
  return input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0].toLowerCase() ?? null;
}

// "https://www.butikk.no/product-page/x" -> "www.butikk.no".
// Gratis Wix-sider deler adresse (bruker.wixsite.com/butikk), så der tas første del av stien med: "butikk.bruker.wixsite.com".
export function wixStoreDomain(productUrl: string): string | null {
  try {
    const url = new URL(productUrl);
    const host = url.hostname.toLowerCase();
    if (host.endsWith(".wixsite.com") || host.endsWith(".wixstudio.com")) {
      const site = url.pathname.split("/").filter(Boolean)[0]?.toLowerCase().replace(/[^a-z0-9-]/g, "");
      return site ? `${site}.${host}` : host;
    }
    return host;
  } catch {
    return null;
  }
}

export class WixError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function wixPost<T>(siteId: string, apiKey: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: apiKey, "wix-site-id": siteId, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new WixError(res.status, `Wix ${path} svarte ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

// Felles form for produktene fra V1 og V3.
type WixProduct = {
  id: string;
  name: string;
  url: string;
  price: number;
  currency: string;
  image: string;
  description: string;
  brand: string;
  createdAt?: string;
};

type V3Product = {
  id?: string;
  name?: string | null;
  visible?: boolean | null;
  url?: { url?: string } | string;
  currency?: string | null;
  actualPriceRange?: { minValue?: { amount?: string } };
  media?: { main?: { image?: { url?: string; id?: string } } };
  plainDescription?: string | null;
  brand?: { name?: string | null };
  createdDate?: string;
};

async function fetchV3(siteId: string, apiKey: string): Promise<WixProduct[]> {
  const out: WixProduct[] = [];
  const fields = ["URL", "CURRENCY", "PLAIN_DESCRIPTION"];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    // Med cursor kan ikke filteret sendes på nytt.
    const query = cursor ? { cursorPaging: { limit: PAGE_SIZE, cursor } } : { filter: { visible: true }, cursorPaging: { limit: PAGE_SIZE } };
    const data: { products?: V3Product[]; pagingMetadata?: { hasNext?: boolean | null; cursors?: { next?: string | null } } } =
      await wixPost(siteId, apiKey, "/stores/v3/products/query", { query, fields });
    for (const p of data.products || []) {
      if (!p.id || !p.name || p.visible === false) continue;
      const url = typeof p.url === "string" ? p.url : p.url?.url || "";
      const image = p.media?.main?.image;
      out.push({
        id: p.id,
        name: p.name,
        url,
        price: parseFloat(p.actualPriceRange?.minValue?.amount || "0") || 0,
        currency: p.currency || "NOK",
        image: image?.url || (image?.id ? `https://static.wixstatic.com/media/${image.id}` : ""),
        description: p.plainDescription || "",
        brand: p.brand?.name || "",
        createdAt: p.createdDate,
      });
    }
    cursor = data.pagingMetadata?.cursors?.next ?? null;
    if (!data.pagingMetadata?.hasNext || !cursor) break;
  }
  return out;
}

type V1Product = {
  id?: string;
  name?: string | null;
  visible?: boolean | null;
  productPageUrl?: { base?: string; path?: string };
  priceData?: { currency?: string; price?: number | null; discountedPrice?: number };
  media?: { mainMedia?: { image?: { url?: string } } };
  description?: string | null;
  brand?: string | null;
  lastUpdated?: string;
};

async function fetchV1(siteId: string, apiKey: string): Promise<WixProduct[]> {
  const out: WixProduct[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const data: { products?: V1Product[] } = await wixPost(siteId, apiKey, "/stores-reader/v1/products/query", {
      query: { paging: { limit: PAGE_SIZE, offset: page * PAGE_SIZE } },
      includeVariants: false,
    });
    const items = data.products || [];
    for (const p of items) {
      if (!p.id || !p.name || p.visible === false) continue;
      const base = (p.productPageUrl?.base || "").replace(/\/$/, "");
      const path = p.productPageUrl?.path || "";
      out.push({
        id: p.id,
        name: p.name,
        url: base && path ? `${base}${path.startsWith("/") ? "" : "/"}${path}` : "",
        price: p.priceData?.discountedPrice ?? p.priceData?.price ?? 0,
        currency: p.priceData?.currency || "NOK",
        image: p.media?.mainMedia?.image?.url || "",
        description: (p.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
        brand: p.brand || "",
        createdAt: p.lastUpdated,
      });
    }
    if (items.length < PAGE_SIZE) break;
  }
  return out;
}

// Alle synlige produkter. Avviser nøkkelen (401/403), prøves ikke V1.
export async function fetchWixRaw(siteId: string, apiKey: string): Promise<WixProduct[]> {
  try {
    return await fetchV3(siteId, apiKey);
  } catch (err) {
    if (err instanceof WixError && (err.status === 401 || err.status === 403)) throw err;
    return fetchV1(siteId, apiKey);
  }
}

type WixStore = { store_domain: string; client_id: string; client_secret: string; display_name: string | null };

// Samme form som Shopify-produktene i lib/products.ts. failed = midlertidig feil som ikke skal mellomlagres.
export async function fetchWixProducts(store: WixStore) {
  const domain = store.store_domain;
  const siteId = store.client_id.slice(WIX_PREFIX.length);
  if (!siteId || !store.client_secret) return { products: [], failed: false };

  let raw: WixProduct[] = [];
  let failed = false;
  try {
    raw = await fetchWixRaw(siteId, store.client_secret);
  } catch (err) {
    console.error(`Kunne ikke hente produkter fra Wix-butikken ${domain}:`, err);
    const status = err instanceof WixError ? err.status : 0;
    failed = status !== 401 && status !== 403 && status !== 404;
  }

  const products = raw
    .filter((p) => /^https:\/\//.test(p.url))
    .map((p) => {
      const description = p.description.slice(0, 500);
      return {
        id: `${domain}-${p.id}`,
        title: p.name,
        price: p.price,
        currency: p.currency,
        category: "",
        vendor: store.display_name || p.brand || domain,
        tags: [] as string[],
        image: p.image,
        sizes: [] as string[],
        url: p.url,
        storeDomain: domain,
        shopifyProductId: p.id,
        createdAt: p.createdAt,
        styles: detectStyles([p.name, description].join(" "), p.name),
      };
    });
  return { products, failed };
}
