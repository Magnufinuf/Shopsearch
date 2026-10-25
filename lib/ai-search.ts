import { Product, categorizeProduct, detectGender } from "@/lib/categories";

// Filtrene AI-søket gir tilbake. Delt mellom server og nettleser.
export type AiFilters = {
  keywords: string[]; // produkttyper/ord som kan stå i tittel eller tagger (norsk + engelsk)
  colors: string[];
  category: string | null; // slug fra lib/categories, f.eks. "sko"
  styles: string[]; // slugs fra lib/styles, f.eks. "old-money"
  minPrice: number | null;
  maxPrice: number | null;
  sizes: string[];
  gender: "herre" | "dame" | "unisex" | null;
  summary: string; // kort forklaring på språket brukeren har valgt, vises over resultatene
};


// Spør AI-søket. null = ikke tilgjengelig (ingen nøkkel, feil o.l.) – bruk vanlig søk da.
export async function fetchAiFilters(query: string, lang = "no"): Promise<AiFilters | null> {
  try {
    const res = await fetch("/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, lang }),
      // Søket skal aldri henge på AI-en: etter 4 sekunder brukes vanlig søk.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()).filters ?? null;
  } catch {
    return null;
  }
}

// Bildesøk: send et bilde (som data-URL) og få filtre tilbake. Tar litt lenger tid enn tekst.
export async function fetchImageFilters(image: string, lang = "no"): Promise<AiFilters | null> {
  try {
    const res = await fetch("/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, lang }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    return (await res.json()).filters ?? null;
  } catch {
    return null;
  }
}

// Krymper bildet i nettleseren (maks 1024 px, JPEG), så det går raskt å sende.
export async function shrinkImage(file: File, maxSize = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w.toLowerCase()));
}

// Finner produktene som passer AI-filtrene. price = prisen i besøkerens valuta.
// strict=false hopper over farge og størrelse (brukes hvis strengt søk gir null treff).
export function matchesAiFilters(p: Product, f: AiFilters, price: number, strict = true): boolean {
  const text = `${p.title} ${p.category} ${p.vendor} ${p.tags.join(" ")}`.toLowerCase();
  if (f.keywords.length && !hasAny(text, f.keywords)) return false;
  if (f.category && categorizeProduct(p) !== f.category) return false;
  if (f.styles.length && !f.styles.some((s) => (p.styles || []).includes(s))) return false;
  if (f.minPrice !== null && price < f.minPrice) return false;
  if (f.maxPrice !== null && price > f.maxPrice) return false;
  if (f.gender && f.gender !== "unisex" && ![f.gender, "unisex"].includes(detectGender(p))) return false;
  if (strict) {
    if (f.colors.length && !hasAny(text, f.colors)) return false;
    if (f.sizes.length && !(p.sizes || []).some((s) => hasAny(s.toLowerCase(), f.sizes))) return false;
  }
  return true;
}
