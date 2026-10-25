// Smakslæring for sveipemodus (/swipe). Alt skjer i nettleseren.
// Hvert produkt brytes ned i «egenskaper» (kategori, kjønn, stil, butikk, prisnivå, ord i tittelen).
// Like gir +1 på egenskapene, nei gir −0,5. Neste produkt er det med høyest sum, med litt tilfeldig utforsking.
import { categorizeProduct, detectGender } from "./categories";

export type TasteProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  localPrices?: Record<string, number>;
  category: string;
  vendor: string;
  tags: string[];
  image: string;
  url: string;
  styles?: string[];
  storeDomain?: string;
  shopifyProductId?: string;
  createdAt?: string;
};

// Det som lagres om likte produkter (nok til å vise et produktkort).
export type LikedProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  localPrices?: Record<string, number>;
  vendor: string;
  image: string;
  url: string;
  storeDomain?: string;
  shopifyProductId?: string;
  createdAt?: string;
};

export type TasteState = {
  weights: Record<string, number>;
  seen: string[];
  liked: LikedProduct[];
};

export const TASTE_KEY = "scavenger_taste";
export const LIKE_DELTA = 1;
export const SKIP_DELTA = -0.5;
export const EXPLORE_RATE = 0.25;
const MAX_SEEN = 5000;
const MAX_LIKED = 500;

// Hvor mye hver type egenskap teller i poengsummen (ord i tittelen er mange, så de teller mindre).
const FEATURE_FACTOR: Record<string, number> = { cat: 1, gender: 1, style: 1, store: 0.7, price: 0.8, kw: 0.5 };

const STOPWORDS = new Set([
  // norsk
  "med", "til", "for", "og", "som", "den", "det", "der", "her", "eller", "uten", "fra", "over", "under", "herre", "dame",
  "unisex", "barn", "str", "size", "farge", "sort", "svart", "hvit", "ny", "nye", "nytt",
  // engelsk
  "with", "the", "and", "for", "from", "this", "that", "your", "mens", "womens", "women", "unisex", "black", "white",
  "edition", "limited", "pack", "new", "collection", "classic", "original", "style",
]);

export function emptyTaste(): TasteState {
  return { weights: {}, seen: [], liked: [] };
}

export function loadTaste(): TasteState {
  try {
    const raw = localStorage.getItem(TASTE_KEY);
    if (!raw) return emptyTaste();
    const data = JSON.parse(raw);
    return {
      weights: data && typeof data.weights === "object" && data.weights ? data.weights : {},
      seen: Array.isArray(data?.seen) ? data.seen.filter((s: unknown) => typeof s === "string") : [],
      liked: Array.isArray(data?.liked) ? data.liked.filter((p: unknown) => p && typeof (p as LikedProduct).id === "string") : [],
    };
  } catch {
    return emptyTaste();
  }
}

export function saveTaste(state: TasteState) {
  try {
    const trimmed: TasteState = {
      weights: state.weights,
      seen: state.seen.slice(-MAX_SEEN),
      liked: state.liked.slice(0, MAX_LIKED),
    };
    localStorage.setItem(TASTE_KEY, JSON.stringify(trimmed));
  } catch {
    // Full eller sperret lagring: smaken glemmes bare.
  }
}

// Prisnivå i besøkerens valuta (omtrentlig, grensene er laget for kroner).
export function priceBucket(amount: number): string {
  if (amount < 300) return "0-300";
  if (amount < 600) return "300-600";
  if (amount < 1200) return "600-1200";
  if (amount < 2500) return "1200-2500";
  return "2500+";
}

export function titleKeywords(title: string, max = 5): string[] {
  const words = title
    .toLowerCase()
    .split(/[^a-zæøåäöüé]+/i)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  return Array.from(new Set(words)).slice(0, max);
}

// amount = prisen i besøkerens valuta (fra convertPrice).
export function productFeatures(p: TasteProduct, amount: number): string[] {
  const feats = new Set<string>();
  feats.add(`cat:${categorizeProduct({ ...p, tags: p.tags || [] })}`);
  feats.add(`gender:${detectGender({ ...p, tags: p.tags || [] })}`);
  for (const s of p.styles || []) feats.add(`style:${s}`);
  if (p.storeDomain) feats.add(`store:${p.storeDomain.toLowerCase()}`);
  feats.add(`price:${priceBucket(amount)}`);
  for (const w of titleKeywords(p.title)) feats.add(`kw:${w}`);
  return Array.from(feats);
}

export function scoreFeatures(features: string[], weights: Record<string, number>): number {
  let sum = 0;
  for (const f of features) {
    const w = weights[f];
    if (w) sum += w * (FEATURE_FACTOR[f.split(":")[0]] ?? 1);
  }
  return sum;
}

export function applySwipe(weights: Record<string, number>, features: string[], liked: boolean): Record<string, number> {
  const next = { ...weights };
  const delta = liked ? LIKE_DELTA : SKIP_DELTA;
  for (const f of features) {
    const v = Math.round(((next[f] || 0) + delta) * 100) / 100;
    if (v === 0) delete next[f];
    else next[f] = v;
  }
  return next;
}

// Velger neste produkt blant de usette. Med sannsynlighet `explore` velges et tilfeldig produkt,
// ellers det med høyest poengsum (likt resultat avgjøres tilfeldig).
export function pickNext<T extends { id: string }>(
  products: T[],
  exclude: Set<string>,
  featuresOf: (p: T) => string[],
  weights: Record<string, number>,
  rand: () => number = Math.random,
  explore = EXPLORE_RATE
): T | null {
  const pool = products.filter((p) => !exclude.has(p.id));
  if (pool.length === 0) return null;
  if (rand() < explore) return pool[Math.floor(rand() * pool.length)];
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const p of pool) {
    // Litt støy så like poengsummer ikke alltid gir samme rekkefølge.
    const s = scoreFeatures(featuresOf(p), weights) + rand() * 0.01;
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}

// De sterkeste positive kategori-/stilsignalene, til «Din stil»-raden.
export function topTaste(weights: Record<string, number>, max = 3): string[] {
  return Object.entries(weights)
    .filter(([k, v]) => v > 0 && (k.startsWith("style:") || k.startsWith("cat:")) && k !== "cat:annet")
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => k);
}

export function toLiked(p: TasteProduct): LikedProduct {
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    currency: p.currency,
    localPrices: p.localPrices,
    vendor: p.vendor,
    image: p.image,
    url: p.url,
    storeDomain: p.storeDomain,
    shopifyProductId: p.shopifyProductId,
    createdAt: p.createdAt,
  };
}
