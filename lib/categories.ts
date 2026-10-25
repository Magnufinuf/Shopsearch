export type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  localPrices?: Record<string, number>; // butikkens egne priser i andre valutaer, f.eks. { NOK: 381 }
  category: string;
  vendor: string;
  tags: string[];
  image: string;
  url: string;
  sizes?: string[];
  styles?: string[];
  storeDomain?: string;
  shopifyProductId?: string;
};

export type CategoryDef = {
  slug: string;
  label: string;
  keywords: string[];
};

export const CATEGORIES: CategoryDef[] = [
  { slug: "sko", label: "Sko", keywords: ["sko", "sneaker", "sneakers", "boots", "støvel", "joggesko"] },
  { slug: "ytterplagg", label: "Ytterplagg", keywords: ["hoodie", "genser", "jakke", "halfzip", "half-zip", "zip-up", "sweater", "cardigan"] },
  { slug: "topper", label: "Topper", keywords: ["t-skjorte", "tskjorte", "t-shirt", "tshirt", "shirt", "singlet", "longsleeve", "long sleeve", "topp"] },
  { slug: "underdeler", label: "Underdeler", keywords: ["bukse", "bukser", "shorts", "jogger", "joggebukse", "pants"] },
  { slug: "undertoy", label: "Undertøy", keywords: ["undertøy", "boxer", "truse", "bh", "underwear"] },
  { slug: "tilbehor", label: "Tilbehør", keywords: ["caps", "cap", "lue", "hansker", "veske", "bag", "belte", "smykke", "accessory"] },
  {
    slug: "interior",
    label: "Hjem & interiør",
    keywords: [
      "poster", "plakat", "canvas", "wall art", "maleri", "bilderamme", "pute", "pillow", "teppe", "blanket", "pledd",
      "kopp", "krus", "mug", "lampe", "lamp", "lys", "candle", "vase", "møbel", "stol", "chair", "bord", "table",
      "hylle", "shelf", "speil", "mirror", "dekor", "decor", "interiør",
    ],
  },
];

function containsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(text);
}

export function categorizeProduct(p: Product): string {
  const text = `${p.title} ${p.category} ${p.tags.join(" ")}`.toLowerCase();
  // Interiør først, så f.eks. en plakat med «t-shirt» i taggene ikke havner under Topper.
  const interior = CATEGORIES.find((c) => c.slug === "interior");
  const titleAndType = `${p.title} ${p.category}`.toLowerCase();
  if (interior && interior.keywords.some((k) => containsWord(titleAndType, k))) return "interior";
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((k) => text.includes(k.toLowerCase()))) {
      return cat.slug;
    }
  }
  return "annet";
}

export type Gender = "herre" | "dame" | "unisex";

export function detectGender(p: Product): Gender {
  const text = `${p.title} ${p.category} ${p.tags.join(" ")}`.toLowerCase();
  if (containsWord(text, "dame") || containsWord(text, "women") || containsWord(text, "woman") || containsWord(text, "womens")) {
    return "dame";
  }
  if (containsWord(text, "herre") || containsWord(text, "men") || containsWord(text, "mens") || containsWord(text, "man")) {
    return "herre";
  }
  return "unisex";
}

export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
