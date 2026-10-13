import { CATEGORIES, categorizeProduct } from "./categories";

export type Advert = {
  id: string;
  store_domain: string;
  media_url: string;
  media_type: "video" | "image";
  caption: string;
  created_at: string;
  category?: string | null;
  comment_count?: number;
};

// Kategorier en annonse kan ha. «annet» er for alt som ikke passer.
export const ADVERT_CATEGORIES = [...CATEGORIES.map((c) => ({ slug: c.slug, label: c.label })), { slug: "annet", label: "Annet" }];

export function isAdvertCategory(slug: unknown): slug is string {
  return typeof slug === "string" && ADVERT_CATEGORIES.some((c) => c.slug === slug);
}

// Kategorien butikken valgte, ellers gjettet ut fra teksten.
export function advertCategory(advert: Advert): string {
  if (isAdvertCategory(advert.category)) return advert.category;
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

// Lenke til butikken, merket så salget kan spores tilbake til Scavenger.
export function storeUrl(storeDomain: string): string {
  return `https://${storeDomain}/?ref=shopsearch&utm_source=shopsearch&utm_medium=referral`;
}

export function advertShareUrl(id: string): string {
  return `${window.location.origin}/adverts?annonse=${encodeURIComponent(id)}`;
}
