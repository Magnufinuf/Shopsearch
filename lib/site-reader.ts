// Leser produktene rett fra en butikks nettside, så butikken bare trenger å skrive inn adressen (kun server).
// Prøver i rekkefølge: Shopify sin åpne produktliste, WooCommerce sitt åpne Store API, og til slutt
// produktsidene fra sitemap med strukturerte data (schema.org Product, det Google bruker).
import { XMLParser } from "fast-xml-parser";
import type { FeedItem } from "./feed";
import { isPublicHttpsUrl, parsePrice } from "./feed";

const UA = "ScavengerBot/1.0 (+https://scavengers.shop)";
const MAX_PRODUCTS = 300;
const MAX_PAGES_TO_READ = 300;
const CONCURRENCY = 8;
const TIME_BUDGET_MS = 40_000;

async function get(url: string, accept = "*/*"): Promise<Response | null> {
  let current = isPublicHttpsUrl(url);
  for (let i = 0; current && i < 4; i++) {
    const res = await fetch(current, { redirect: "manual", cache: "no-store", headers: { "User-Agent": UA, Accept: accept }, signal: AbortSignal.timeout(12000) }).catch(() => null);
    if (!res) return null;
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = isPublicHttpsUrl(new URL(location, current).toString());
      continue;
    }
    return res;
  }
  return null;
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await get(url, "application/json");
  if (!res?.ok || !(res.headers.get("content-type") || "").includes("json")) return null;
  return (await res.json().catch(() => null)) as T | null;
}

async function getText(url: string): Promise<string | null> {
  const res = await get(url);
  if (!res?.ok) return null;
  const text = await res.text().catch(() => null);
  return text && text.length < 15_000_000 ? text : null;
}

// --- 1. Shopify: /products.json er åpen på alle Shopify-butikker ---
type ShopifyJson = {
  products?: {
    id: number;
    title: string;
    handle: string;
    product_type?: string;
    vendor?: string;
    tags?: string[] | string;
    body_html?: string;
    images?: { src: string }[];
    variants?: { price: string; available?: boolean; option1?: string | null }[];
  }[];
};

async function readShopify(origin: string): Promise<FeedItem[]> {
  const first = await getJson<ShopifyJson>(`${origin}/products.json?limit=250&page=1`);
  if (!first?.products) return [];
  const cart = await getJson<{ currency?: string }>(`${origin}/cart.js`);
  const currency = cart?.currency || "NOK";
  const all = [...first.products];
  for (let page = 2; page <= 4 && all.length === (page - 1) * 250; page++) {
    const next = await getJson<ShopifyJson>(`${origin}/products.json?limit=250&page=${page}`);
    if (!next?.products?.length) break;
    all.push(...next.products);
  }
  return all
    .filter((p) => p.variants?.some((v) => v.available !== false))
    .slice(0, MAX_PRODUCTS)
    .map((p) => ({
      id: String(p.id),
      title: p.title,
      link: `${origin}/products/${p.handle}`,
      image: p.images?.[0]?.src || "",
      price: parseFloat(p.variants?.[0]?.price || "0") || 0,
      currency,
      category: p.product_type || "",
      brand: p.vendor || "",
      description: (p.body_html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500),
      sizes: (p.variants || []).map((v) => v.option1 || "").filter(Boolean),
    }));
}

// --- 2. WooCommerce: Store API er åpen uten nøkkel ---
type WooStoreProduct = {
  id: number;
  name: string;
  permalink: string;
  is_in_stock?: boolean;
  prices?: { price: string; currency_code: string; currency_minor_unit: number };
  images?: { src: string }[];
  categories?: { name: string }[];
  short_description?: string;
};

async function readWooStore(origin: string): Promise<FeedItem[]> {
  const all: WooStoreProduct[] = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await getJson<WooStoreProduct[]>(`${origin}/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all
    .filter((p) => p.is_in_stock !== false && p.permalink)
    .slice(0, MAX_PRODUCTS)
    .map((p) => {
      const minor = p.prices?.currency_minor_unit ?? 2;
      return {
        id: String(p.id),
        title: p.name.replace(/&amp;/g, "&"),
        link: p.permalink,
        image: p.images?.[0]?.src || "",
        price: (parseInt(p.prices?.price || "0", 10) || 0) / 10 ** minor,
        currency: p.prices?.currency_code || "NOK",
        category: p.categories?.[0]?.name || "",
        brand: "",
        description: (p.short_description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500),
        sizes: [],
      };
    });
}

// --- 3. Sitemap + strukturerte data på produktsidene ---
const xml = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false });

function asArray<T>(v: T | T[] | undefined): T[] {
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

async function sitemapUrls(origin: string, host: string): Promise<string[]> {
  const robots = (await getText(`${origin}/robots.txt`)) || "";
  const starts = Array.from(robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)).map((m) => m[1]);
  if (!starts.length) starts.push(`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`);

  const pages = new Set<string>();
  const queue = [...starts];
  const visited = new Set<string>();
  while (queue.length && visited.size < 15 && pages.size < 5000) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    const text = await getText(url);
    if (!text || !text.trimStart().startsWith("<")) continue;
    let doc;
    try {
      doc = xml.parse(text);
    } catch {
      continue;
    }
    // Indeks med flere sitemaps: produkt-sitemaps først.
    const children = asArray(doc?.sitemapindex?.sitemap).map((s: { loc?: string }) => String(s.loc || "")).filter(Boolean);
    children.sort((a, b) => Number(/produ/i.test(b)) - Number(/produ/i.test(a)));
    queue.unshift(...children.filter((c) => /produ/i.test(c)));
    queue.push(...children.filter((c) => !/produ/i.test(c)));
    for (const u of asArray(doc?.urlset?.url)) {
      const loc = String((u as { loc?: string }).loc || "");
      try {
        if (new URL(loc).hostname.toLowerCase() === host) pages.add(loc);
      } catch {}
    }
  }
  const list = Array.from(pages);
  // Sider som ser ut som produkter først.
  const looksLikeProduct = (u: string) => /\/(products?|produkt(er)?|p|item|vare|shop)\/|[?&]product/i.test(u);
  return [...list.filter(looksLikeProduct), ...list.filter((u) => !looksLikeProduct(u))];
}

type Json = Record<string, unknown>;

function findProducts(node: unknown, out: Json[]) {
  if (Array.isArray(node)) return node.forEach((n) => findProducts(n, out));
  if (!node || typeof node !== "object") return;
  const obj = node as Json;
  const type = asArray(obj["@type"] as string | string[]).map(String);
  if (type.includes("Product") || type.includes("ProductGroup")) out.push(obj);
  if (obj["@graph"]) findProducts(obj["@graph"], out);
}

function text(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return text(v[0]);
  if (v && typeof v === "object") return text((v as Json).url ?? (v as Json).name ?? (v as Json)["@id"] ?? "");
  return v == null ? "" : String(v);
}

function fromJsonLd(p: Json, pageUrl: string): FeedItem | null {
  const variant = asArray(p.hasVariant as Json | Json[])[0];
  const offersRaw = p.offers ?? variant?.offers;
  const offers = asArray(offersRaw as Json | Json[]);
  const offer = offers[0] || {};
  const priceText = text(offer.price ?? offer.lowPrice ?? (offer.priceSpecification as Json | undefined)?.price ?? "");
  const price = parseFloat(priceText.replace(",", "."));
  const availability = text(offer.availability).toLowerCase();
  if (!text(p.name) || !isFinite(price) || /outofstock|soldout|discontinued/.test(availability)) return null;
  const image = text(p.image ?? variant?.image);
  return {
    id: text(p.sku ?? p.productID ?? p.productGroupID) || pageUrl,
    title: text(p.name),
    link: /^https:\/\//.test(text(p.url)) ? text(p.url) : pageUrl,
    image: /^https:\/\//.test(image) ? image : "",
    price,
    currency: text(offer.priceCurrency) || "NOK",
    category: text(p.category).split(">").pop()!.trim(),
    brand: text(p.brand),
    description: text(p.description).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 500),
    sizes: [],
  };
}

// Reserve: Open Graph-produktmerker (og:type product, product:price:amount).
function fromOpenGraph(html: string, pageUrl: string): FeedItem | null {
  const meta = (prop: string) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i"))?.[1] ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i"))?.[1] ||
    "";
  const amount = meta("product:price:amount") || meta("og:price:amount");
  const title = meta("og:title");
  if (!amount || !title) return null;
  const { amount: price } = parsePrice(amount);
  const image = meta("og:image");
  return {
    id: pageUrl,
    title,
    link: pageUrl,
    image: /^https:\/\//.test(image) ? image : "",
    price,
    currency: meta("product:price:currency") || meta("og:price:currency") || "NOK",
    category: "",
    brand: meta("product:brand"),
    description: meta("og:description").slice(0, 500),
    sizes: [],
  };
}

export function productFromHtml(html: string, pageUrl: string): FeedItem | null {
  const found: Json[] = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      findProducts(JSON.parse(m[1].trim()), found);
    } catch {}
  }
  for (const p of found) {
    const item = fromJsonLd(p, pageUrl);
    if (item) return item;
  }
  return fromOpenGraph(html, pageUrl);
}

async function readStructuredData(origin: string, host: string): Promise<FeedItem[]> {
  const started = Date.now();
  const urls = (await sitemapUrls(origin, host)).slice(0, MAX_PAGES_TO_READ);
  const items: FeedItem[] = [];
  let index = 0;
  let misses = 0;
  async function worker() {
    while (index < urls.length && items.length < MAX_PRODUCTS && Date.now() - started < TIME_BUDGET_MS) {
      const url = urls[index++];
      const html = await getText(url);
      const item = html ? productFromHtml(html, url) : null;
      if (item) items.push(item);
      else if (++misses > 60 && items.length === 0) return; // ingen produktsider å finne
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return items;
}

export type SiteResult = { items: FeedItem[]; method: "shopify" | "woocommerce" | "structured" | "none" };

// Alle produktene vi finner på nettsiden. Tom liste hvis ingen metode virker.
export async function readSite(siteUrl: string): Promise<SiteResult> {
  const url = isPublicHttpsUrl(siteUrl);
  if (!url) return { items: [], method: "none" };
  const origin = url.origin;
  const host = url.hostname.toLowerCase();

  const shopify = await readShopify(origin).catch(() => []);
  if (shopify.length) return { items: shopify, method: "shopify" };
  const woo = await readWooStore(origin).catch(() => []);
  if (woo.length) return { items: woo, method: "woocommerce" };
  const structured = await readStructuredData(origin, host).catch(() => []);
  if (structured.length) return { items: structured, method: "structured" };
  return { items: [], method: "none" };
}

// "butikken.no", "https://www.butikken.no/shop" -> "https://www.butikken.no"
export function normalizeSiteUrl(input: string): string | null {
  const raw = input.trim();
  const url = isPublicHttpsUrl(/^https?:\/\//i.test(raw) ? raw.replace(/^http:/i, "https:") : `https://${raw}`);
  return url ? url.origin : null;
}
