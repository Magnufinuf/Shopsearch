import { CATEGORIES, categorizeProduct } from "./categories";

export type Advert = {
  id: string;
  store_domain: string;
  media_url: string;
  media_type: "video" | "image";
  caption: string;
  created_at: string;
  category?: string | null;
  // Butikkens visningsnavn (fra /api/adverts), ellers myshopify-navnet.
  store_name?: string;
  // Satt når annonsen gjelder ett produkt; ellers er det hele butikken.
  product_url?: string | null;
  product_title?: string | null;
  // Hentet fra produktet av /api/adverts (bare produktannonser).
  product_price?: number;
  product_currency?: string;
  styles?: string[];
  gender?: "herre" | "dame" | "unisex";
  comment_count?: number;
};

// Kategorier en annonse kan ha. «butikk» er annonser for hele butikken, «annet» for alt som ikke passer.
export const STORE_CATEGORY = "butikk";
export const ADVERT_CATEGORIES = [
  { slug: STORE_CATEGORY, label: "Butikker" },
  ...CATEGORIES.map((c) => ({ slug: c.slug, label: c.label })),
  { slug: "annet", label: "Annet" },
];

export function isAdvertCategory(slug: unknown): slug is string {
  return typeof slug === "string" && ADVERT_CATEGORIES.some((c) => c.slug === slug);
}

// Kategorien butikken valgte, ellers gjettet ut fra teksten.
export function advertCategory(advert: Advert): string {
  if (isAdvertCategory(advert.category)) return advert.category;
  if (!advert.product_url) return STORE_CATEGORY;
  return categorizeProduct({
    id: String(advert.id),
    title: advert.caption || "",
    price: 0,
    currency: "NOK",
    category: "",
    vendor: "",
    tags: [],
    image: "",
    url: "",
  });
}

export function advertStoreName(advert: Advert): string {
  return advert.store_name || advert.store_domain.replace(".myshopify.com", "");
}

// Lenke til butikken, merket så salget kan spores tilbake til Scavenger.
export function storeUrl(storeDomain: string): string {
  return `https://${storeDomain}/?ref=shopsearch&utm_source=shopsearch&utm_medium=referral`;
}

// En produktlenke må høre til butikken som legger ut annonsen.
export function isOwnProductUrl(url: unknown, storeDomain: string): url is string {
  if (typeof url !== "string") return false;
  const prefix = `https://${storeDomain}/products/`;
  return url.startsWith(prefix) && /^[a-z0-9][a-z0-9-]*$/i.test(url.slice(prefix.length));
}

// Hvor «Kjøp»/«Besøk butikken» sender deg, merket så salget kan spores.
export function advertTargetUrl(advert: Advert): string {
  if (!advert.product_url) return storeUrl(advert.store_domain);
  return `${advert.product_url}?ref=shopsearch&utm_source=shopsearch&utm_medium=referral`;
}

export function advertShareUrl(id: string): string {
  return `${window.location.origin}/adverts?annonse=${encodeURIComponent(id)}`;
}
