"use client";
// «For deg»: Scavenger lærer hva du liker av det du trykker på, lagrer og liker i Swipe,
// og anbefaler lignende produkter. Bruker samme smak som Swipe (lib/taste.ts). Alt lagres bare i nettleseren.
import { TasteProduct, loadTaste, productFeatures, saveTaste, scoreFeatures } from "./taste";

const VIEWED_KEY = "scavenger_viewed";
const MAX_VIEWED = 50;
const CLICK_DELTA = 0.5;
const SAVE_DELTA = 1;

// Det et produktkort vet om produktet (resten av feltene er valgfrie).
type AnyProduct = Partial<TasteProduct> & { id: string; title: string; price: number; currency: string };

function asTaste(p: AnyProduct): TasteProduct {
  return {
    ...p,
    category: p.category || "",
    vendor: p.vendor || "",
    tags: p.tags || [],
    image: p.image || "",
    url: p.url || "",
  } as TasteProduct;
}

// Omtrentlig pris i kroner (nok til prisnivå).
function amountOf(p: AnyProduct): number {
  return p.localPrices?.NOK ?? p.price;
}

function readViewed(): string[] {
  try {
    const data = JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]");
    return Array.isArray(data) ? data.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

// Kalles når noen trykker på et produkt (click) eller lagrer det med hjertet (save).
export function recordInterest(p: AnyProduct, kind: "click" | "save") {
  try {
    const taste = loadTaste();
    const delta = kind === "save" ? SAVE_DELTA : CLICK_DELTA;
    const weights = { ...taste.weights };
    for (const f of productFeatures(asTaste(p), amountOf(p))) {
      weights[f] = Math.round(((weights[f] || 0) + delta) * 100) / 100;
    }
    saveTaste({ ...taste, weights });
    const viewed = [p.id, ...readViewed().filter((id) => id !== p.id)].slice(0, MAX_VIEWED);
    localStorage.setItem(VIEWED_KEY, JSON.stringify(viewed));
  } catch {
    // Anbefalinger skal aldri stoppe brukeren.
  }
}

// Produktene som passer best med smaken. Tom liste hvis vi ikke vet noe ennå.
// Produkter man nettopp har sett på kommer bak lignende produkter man ikke har sett.
export function recommend<T extends AnyProduct>(catalog: T[], limit: number): T[] {
  const { weights } = loadTaste();
  if (Object.keys(weights).length === 0) return [];
  const viewed = new Set(readViewed());
  return catalog
    .map((p) => ({ p, score: scoreFeatures(productFeatures(asTaste(p), amountOf(p)), weights) - (viewed.has(p.id) ? 1 : 0) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.p);
}
