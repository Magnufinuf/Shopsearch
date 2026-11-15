// Kobling mot butikker via produktfeed (kun server): Google Shopping / Meta-katalog (XML) eller CSV/TSV.
// Nesten alle nettbutikkplattformer kan lage en sånn feed, så butikker på Mystore, Centra, Magento osv. kan være med.
import { XMLParser } from "fast-xml-parser";
import { detectStyles } from "./styles";

export const FEED_PREFIX = "feed:";
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_PRODUCTS = 5000;
const MAX_REDIRECTS = 3;

export function isFeedStore(clientId: string | null | undefined): boolean {
  return !!clientId?.startsWith(FEED_PREFIX);
}

export class FeedError extends Error {
  constructor(public reason: "url" | "fetch" | "format" | "empty", message: string) {
    super(message);
  }
}

// Bare vanlige, offentlige https-adresser (ikke localhost, interne navn eller IP-adresser).
export function isPublicHttpsUrl(input: string): URL | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return null; // utelukker IP-adresser og navn uten punktum
  if (/(^|\.)(localhost|local|internal|lan|home|corp)$/.test(host)) return null;
  return url;
}

// Henter feeden og følger noen få omdirigeringer, hver av dem sjekket.
async function download(feedUrl: string): Promise<string> {
  let url = isPublicHttpsUrl(feedUrl);
  if (!url) throw new FeedError("url", "Ugyldig feed-adresse");
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      headers: { "User-Agent": "ScavengerBot/1.0 (+https://scavengers.shop)" },
      signal: AbortSignal.timeout(20000),
    }).catch(() => null);
    if (!res) throw new FeedError("fetch", `Fikk ikke kontakt med ${url.hostname}`);
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = isPublicHttpsUrl(new URL(res.headers.get("location")!, url).toString());
      if (!url) throw new FeedError("url", "Feeden omdirigerer til en ugyldig adresse");
      continue;
    }
    if (!res.ok) throw new FeedError("fetch", `Feeden svarte ${res.status}`);
    if (Number(res.headers.get("content-length") || 0) > MAX_BYTES) throw new FeedError("format", "Feeden er for stor");
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new FeedError("format", "Feeden er for stor");
    return text;
  }
  throw new FeedError("fetch", "For mange omdirigeringer");
}

export type FeedItem = {
  id: string;
  title: string;
  link: string;
  image: string;
  price: number;
  currency: string;
  category: string;
  brand: string;
  description: string;
  sizes: string[];
};

// "499.00 NOK", "NOK 499", "499,00 kr" -> { amount: 499, currency: "NOK" }
export function parsePrice(raw: string): { amount: number; currency: string | null } {
  const text = raw.trim();
  const currency = text.match(/\b([A-Z]{3})\b/)?.[1] ?? (/\bkr\b|,-/i.test(text) ? "NOK" : null);
  const num = text.replace(/[^0-9.,]/g, "");
  // Komma som desimaltegn ("499,50") eller tusenskille ("1,499.00").
  const normalized = /,\d{1,2}$/.test(num) ? num.replace(/\./g, "").replace(",", ".") : num.replace(/,/g, "");
  const amount = parseFloat(normalized);
  return { amount: isFinite(amount) ? amount : 0, currency };
}

function str(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    return str(v["#text"] ?? v["@_href"] ?? "");
  }
  return String(value).trim();
}

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = str(obj[k]);
    if (v) return v;
  }
  return "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

function toItem(get: (keys: string[]) => string, defaultCurrency: string): FeedItem | null {
  const availability = get(["availability"]).toLowerCase();
  if (/out[ _]of[ _]stock|utsolgt|ikke på lager/.test(availability)) return null;
  const link = get(["link", "url", "product_url", "produkt_url", "lenke"]);
  const title = get(["title", "name", "produktnavn", "navn"]);
  if (!title || !/^https:\/\//i.test(link)) return null;
  const regular = parsePrice(get(["price", "pris"]));
  const sale = parsePrice(get(["sale_price", "salgspris", "tilbudspris"]));
  const price = sale.amount > 0 && sale.amount < regular.amount ? sale : regular;
  const image = get(["image_link", "image", "image_url", "bilde", "bilde_url"]);
  const sizes = get(["size", "størrelse", "storrelse"]);
  return {
    id: get(["id", "item_group_id", "sku", "varenummer"]) || link,
    title,
    link,
    image: /^https:\/\//i.test(image) ? image : "",
    price: price.amount,
    currency: price.currency || regular.currency || defaultCurrency,
    category: get(["product_type", "google_product_category", "category", "kategori"]).split(">").pop()!.trim(),
    brand: get(["brand", "merke", "produsent"]),
    description: stripHtml(get(["description", "beskrivelse"])).slice(0, 500),
    sizes: sizes ? sizes.split(/[,/|]/).map((s) => s.trim()).filter(Boolean) : [],
  };
}

function parseXml(text: string): FeedItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, processEntities: true });
  const doc = parser.parse(text);
  const raw = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.products?.product ?? doc?.produkter?.produkt ?? [];
  const list: Record<string, unknown>[] = Array.isArray(raw) ? raw : [raw];
  return list
    .map((o) => toItem((keys) => pick(o, keys), "NOK"))
    .filter((i): i is FeedItem => !!i);
}

// Enkel CSV/TSV-leser med støtte for felter i anførselstegn.
function parseDelimited(text: string): FeedItem[] {
  const firstLine = text.slice(0, text.indexOf("\n") >>> 0 || text.length);
  const delim = ["\t", ";", ","].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ",");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = (rows.shift() || []).map((h) => h.trim().toLowerCase().replace(/^g:/, "").replace(/\s+/g, "_"));
  return rows
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => toItem((keys) => {
      for (const k of keys) {
        const idx = header.indexOf(k);
        if (idx >= 0 && r[idx]?.trim()) return r[idx].trim();
      }
      return "";
    }, "NOK"))
    .filter((i): i is FeedItem => !!i);
}

export function parseFeed(text: string): FeedItem[] {
  const trimmed = text.replace(/^\uFEFF/, "").trimStart();
  const items = trimmed.startsWith("<") ? parseXml(trimmed) : parseDelimited(trimmed);
  // Samme produkt i flere varianter (f.eks. størrelser) slås sammen til ett.
  const seen = new Map<string, FeedItem>();
  for (const item of items) {
    const prev = seen.get(item.link);
    if (prev) prev.sizes = Array.from(new Set([...prev.sizes, ...item.sizes]));
    else seen.set(item.link, item);
    if (seen.size >= MAX_PRODUCTS) break;
  }
  return Array.from(seen.values());
}

export async function fetchFeed(feedUrl: string): Promise<FeedItem[]> {
  const text = await download(feedUrl);
  let items: FeedItem[];
  try {
    items = parseFeed(text);
  } catch {
    throw new FeedError("format", "Klarte ikke å lese feeden");
  }
  if (items.length === 0) throw new FeedError("empty", "Fant ingen produkter i feeden");
  return items;
}

// Butikkens domene ut fra produktlenkene ("https://www.butikk.no/p/1" -> "www.butikk.no").
export function feedDomain(items: FeedItem[]): string | null {
  const counts = new Map<string, number>();
  for (const i of items) {
    try {
      const host = new URL(i.link).hostname.toLowerCase();
      counts.set(host, (counts.get(host) || 0) + 1);
    } catch {}
  }
  return Array.from(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

// E-postadressen må høre til butikkens domene (post@butikk.no for www.butikk.no).
export function emailMatchesDomain(email: string, domain: string): boolean {
  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (!emailDomain) return false;
  const host = domain.replace(/^www\./, "");
  return host === emailDomain || host.endsWith(`.${emailDomain}`);
}

type FeedStore = { store_domain: string; client_id: string; client_secret: string; display_name: string | null };

// Samme form som Shopify-produktene i lib/products.ts. failed = midlertidig feil som ikke skal mellomlagres.
export async function fetchFeedProducts(store: FeedStore) {
  const domain = store.store_domain;
  let items: FeedItem[] = [];
  let failed = false;
  try {
    items = await fetchFeed(store.client_secret);
  } catch (err) {
    console.error(`Kunne ikke hente feeden til ${domain}:`, err instanceof Error ? err.message : err);
    failed = !(err instanceof FeedError && (err.reason === "url" || err.reason === "empty"));
  }
  const products = items
    .filter((i) => {
      try {
        return new URL(i.link).hostname.toLowerCase() === domain;
      } catch {
        return false;
      }
    })
    .map((i) => ({
      id: `${domain}-${i.id}`,
      title: i.title,
      price: i.price,
      currency: i.currency,
      category: i.category,
      vendor: store.display_name || i.brand || domain,
      tags: i.brand ? [i.brand] : [],
      image: i.image,
      sizes: i.sizes,
      url: i.link,
      storeDomain: domain,
      shopifyProductId: i.id.slice(0, 64),
      createdAt: undefined as string | undefined,
      styles: detectStyles([i.title, i.category, i.brand, i.description].join(" "), `${i.title} ${i.category}`),
    }));
  return { products, failed };
}
