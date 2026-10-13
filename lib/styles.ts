// Stiler man kan søke på («old money», «streetwear» osv.).
// Et produkt får en stil hvis tittel, tagger, type, merke eller beskrivelse inneholder et av stikkordene.
// Delt mellom server (som merker produktene) og nettleser (som tolker søket).

export type StyleDef = {
  slug: string;
  label: string;
  // Ord man kan skrive i søket for å velge stilen.
  aliases: string[];
  // Ord i produktdata som tyder på stilen.
  keywords: string[];
};

export const STYLES: StyleDef[] = [
  {
    slug: "old-money",
    label: "Old money",
    aliases: ["old money", "oldmoney", "quiet luxury"],
    keywords: [
      "old money", "quiet luxury", "polo", "oxford", "chinos", "chino", "loafers", "loafer", "cable knit", "kabelstrikk",
      "cashmere", "kasjmir", "merino", "blazer", "linen", "tennis", "boat shoe", "seilersko", "tweed",
      "ralph lauren", "lacoste", "gant", "burberry", "quarter zip", "quarter-zip",
    ],
  },
  {
    slug: "sos",
    label: "Sos",
    aliases: ["sos", "sossete", "sosse", "preppy"],
    keywords: [
      "sos", "preppy", "polo", "oxford", "chinos", "halfzip", "half-zip", "half zip", "quarter zip",
      "cardigan", "loafers", "ralph lauren", "tommy hilfiger", "gant",
      "lacoste", "dale of norway", "holzweiler", "morris",
    ],
  },
  {
    slug: "streetwear",
    label: "Streetwear",
    aliases: ["streetwear", "street", "urban"],
    keywords: [
      "streetwear", "street", "hoodie", "oversized", "boxy", "cargo", "graphic", "print", "baggy", "sneakers",
      "jordan", "nike", "stussy", "stüssy", "supreme", "carhartt", "essentials", "washed", "skate", "tee", "t-shirt",
      "car", "racing",
    ],
  },
  {
    slug: "sporty",
    label: "Sporty",
    aliases: ["sporty", "sport", "athleisure", "trening", "gym"],
    keywords: [
      "sport", "athleisure", "gym", "trening", "tights", "track", "jersey", "running", "løp", "adidas", "nike",
      "puma", "under armour", "dri-fit", "dryfit",
    ],
  },
  {
    slug: "friluft",
    label: "Friluft",
    aliases: ["friluft", "gorpcore", "outdoor", "tur"],
    keywords: [
      "gorpcore", "outdoor", "friluft", "fleece", "skalljakke", "shell", "gore-tex", "goretex", "dunjakke",
      "puffer", "anorak", "arc'teryx", "arcteryx", "the north face", "patagonia", "salomon", "bergans", "norrøna",
    ],
  },
  {
    slug: "minimalistisk",
    label: "Minimalistisk",
    aliases: ["minimalistisk", "minimal", "minimalist", "basic", "clean"],
    keywords: ["minimal", "basic", "plain", "ensfarget", "essential", "monochrome", "clean", "cos", "arket", "uniqlo"],
  },
  {
    slug: "vintage",
    label: "Vintage",
    aliases: ["vintage", "retro", "y2k", "90s", "90-tallet"],
    keywords: ["vintage", "retro", "y2k", "90s", "80s", "70s", "faded", "thrift", "throwback"],
  },
];

function matchesWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zæøå0-9])${escaped}($|[^a-zæøå0-9])`, "i").test(text);
}

// Ting som ikke er klær (plakater, kopper, klistremerker …) skal ikke få klesstiler.
const NOT_CLOTHING = [
  "poster", "plakat", "canvas", "wall art", "framed print", "art print", "maleri", "bilde",
  "mug", "kopp", "krus", "sticker", "klistremerke", "phone case", "mobildeksel", "iphone case",
  "keychain", "nøkkelring", "puzzle", "puslespill", "pute", "pillow", "blanket", "teppe", "gift card", "gavekort",
];

export function isClothing(titleAndType: string): boolean {
  const lower = titleAndType.toLowerCase();
  return !NOT_CLOTHING.some((w) => matchesWord(lower, w));
}

// Hvilke stiler passer produktet? text = tittel + tagger + type + merke + beskrivelse.
// titleAndType = bare tittel og produkttype, brukes til å se om det i det hele tatt er klær.
export function detectStyles(text: string, titleAndType = text): string[] {
  if (!isClothing(titleAndType)) return [];
  const lower = text.toLowerCase();
  return STYLES.filter((s) => s.keywords.some((k) => matchesWord(lower, k))).map((s) => s.slug);
}

// Finner en stil i søketeksten («old money hoodie under 500») og fjerner den fra teksten.
export function extractStyle(query: string): { style?: StyleDef; rest: string } {
  for (const style of STYLES) {
    // Lengste alias først, så «old money» vinner over «old».
    for (const alias of [...style.aliases].sort((a, b) => b.length - a.length)) {
      if (matchesWord(query, alias)) {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rest = query.replace(new RegExp(escaped, "i"), " ").replace(/\s+/g, " ").trim();
        return { style, rest };
      }
    }
  }
  return { rest: query };
}
