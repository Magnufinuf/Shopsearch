// Smart søk uten AI: forstår vanlig norsk som «noe varmt til vinteren under 1000»,
// «svarte sneakers str 43», «gensere til gutt» og skrivefeil som «hodie».
// Helt gratis – alt er regler og ordlister her i fila. Brukes i nettleseren.
import { Product, detectGender } from "@/lib/categories";
import { STYLES, extractStyle } from "@/lib/styles";

export type SmartQuery = {
  // Hver gruppe er «ett av disse ordene må finnes». Alle gruppene må passe.
  groups: { label: string; words: string[]; soft: boolean; exclude?: string[] }[];
  colors: { label: string; words: string[] }[];
  styles: string[];
  minPrice: number | null;
  maxPrice: number | null;
  sizes: string[];
  gender: "herre" | "dame" | null;
  summary: string;
};

// ---------- Ordlister ----------

// Produkttyper. label = flertall som vises i oppsummeringen.
const TYPES: { label: string; words: string[]; exclude?: string[] }[] = [
  // Hettegensere før gensere, så «hoodie» gir bare hoodies, mens «genser» også tar med hoodies.
  { label: "hettegensere", words: ["hoodie", "hettegenser", "hettejakke", "zip hoodie"] },
  { label: "gensere", words: ["genser", "sweater", "sweatshirt", "collegegenser", "strikk", "strikkegenser", "pullover", "crewneck", "halfzip", "half-zip", "quarter zip", "quarter-zip", "cardigan", "hoodie"] },
  { label: "jakker", words: ["jakke", "jacket", "coat", "kåpe", "frakk", "dunjakke", "puffer", "parkas", "bomberjakke", "vest"] },
  // «sweatshirt» inneholder «tshirt», så den holdes utenfor.
  { label: "t-skjorter", words: ["t-skjorte", "tskjorte", "t-shirt", "tshirt", "tee"], exclude: ["sweatshirt"] },
  // «shirt» står også i «t-shirt», så t-skjorter holdes utenfor.
  { label: "skjorter", words: ["skjorte", "shirt", "oxford", "flanell", "overshirt"], exclude: ["t-shirt", "tshirt", "t-skjorte", "tskjorte", "sweatshirt"] },
  { label: "poloer", words: ["polo", "piké", "pique"] },
  { label: "bukser", words: ["bukse", "pants", "trousers", "chinos", "chino", "jeans", "cargo", "joggebukse", "jogger", "sweatpants"] },
  { label: "jeans", words: ["jeans", "dongeri", "denim"] },
  { label: "shorts", words: ["shorts"] },
  { label: "sko", words: ["sko", "shoes", "sneakers", "sneaker", "joggesko", "boots", "støvel", "støvler", "loafers", "loafer"] },
  { label: "luer og caps", words: ["caps", "cap", "lue", "lua", "beanie", "hatt", "hat", "bøttehatt", "bucket hat"] },
  { label: "kjoler", words: ["kjole", "dress"] },
  { label: "skjørt", words: ["skjørt", "skirt"] },
  { label: "vesker", words: ["veske", "bag", "sekk", "ryggsekk", "tote", "bæreveske"] },
  { label: "sokker", words: ["sokker", "sokk", "socks"] },
  { label: "undertøy", words: ["undertøy", "boxer", "truse", "underwear", "bh"] },
  { label: "smykker", words: ["smykke", "kjede", "halskjede", "armbånd", "øredobber", "jewelry", "necklace", "bracelet"] },
  { label: "skjerf", words: ["skjerf", "scarf"] },
  { label: "hansker", words: ["hansker", "votter", "gloves"] },
  { label: "belter", words: ["belte", "belt"] },
  { label: "tights", words: ["tights", "leggings"] },
];

// Vage ønsker -> produkttyper/ord. soft = kan droppes hvis søket gir null treff.
const CONCEPTS: { triggers: string[]; label: string; words: string[]; style?: string }[] = [
  {
    triggers: ["varm", "varmt", "varme", "vinter", "vinteren", "kald", "kaldt", "kulde", "vinterklær"],
    label: "varme plagg",
    words: ["genser", "sweater", "strikk", "hoodie", "hettegenser", "jakke", "jacket", "dunjakke", "puffer", "fleece", "ull", "wool", "lue", "beanie", "skjerf", "hansker", "votter", "cardigan"],
  },
  {
    triggers: ["sommer", "sommeren", "sol", "strand", "ferie", "sommerklær"],
    label: "sommerklær",
    words: ["t-skjorte", "t-shirt", "tee", "shorts", "singlet", "polo", "lin", "linen", "caps", "cap"],
  },
  {
    triggers: ["fest", "festlig", "pent", "pen", "pene", "bryllup", "date", "julebord", "konfirmasjon", "bursdag", "middag"],
    label: "pene klær",
    words: ["skjorte", "shirt", "kjole", "blazer", "polo", "loafers", "chinos", "oxford"],
  },
  {
    triggers: ["trening", "trene", "gym", "løping", "løpe", "sport", "treningsklær"],
    label: "treningsklær",
    words: ["shorts", "tights", "t-skjorte", "t-shirt", "tee", "track", "jogger", "sports"],
    style: "sporty",
  },
  {
    triggers: ["bil", "biler", "bilen", "bilklær", "motor", "racing", "rally"],
    label: "bilmotiver",
    words: ["car", "cars", "bil", "porsche", "bmw", "audi", "ferrari", "mercedes", "nissan", "toyota", "racing", "speed", "motor", "gt"],
  },
  {
    triggers: ["regn", "regnvær", "vått", "vind"],
    label: "regntøy",
    words: ["regnjakke", "skalljakke", "shell", "gore-tex", "anorak", "vindjakke"],
  },
];

const COLORS: { label: string; words: string[] }[] = [
  { label: "svart", words: ["svart", "svarte", "sort", "sorte", "black"] },
  { label: "hvit", words: ["hvit", "hvite", "hvitt", "white", "offwhite", "off-white"] },
  { label: "grå", words: ["grå", "grått", "grey", "gray"] },
  { label: "blå", words: ["blå", "blått", "blue", "navy", "marine", "marineblå"] },
  { label: "rød", words: ["rød", "røde", "rødt", "red", "burgunder", "bordeaux"] },
  { label: "grønn", words: ["grønn", "grønne", "grønt", "green", "oliven", "olive"] },
  { label: "beige", words: ["beige", "sand", "creme", "krem", "cream", "khaki"] },
  { label: "brun", words: ["brun", "brune", "brunt", "brown"] },
  { label: "rosa", words: ["rosa", "pink"] },
  { label: "gul", words: ["gul", "gule", "gult", "yellow"] },
  { label: "lilla", words: ["lilla", "purple"] },
  { label: "oransje", words: ["oransje", "orange"] },
];

const GENDERS: { gender: "herre" | "dame"; words: string[] }[] = [
  { gender: "herre", words: ["herre", "herrer", "mann", "menn", "gutt", "gutter", "gutta", "kjæreste-han", "men", "mens"] },
  { gender: "dame", words: ["dame", "damer", "kvinne", "kvinner", "jente", "jenter", "jentene", "women", "womens"] },
];

const STOPWORDS = new Set([
  "noe", "noen", "til", "en", "et", "ei", "med", "for", "og", "i", "på", "som", "jeg", "vil", "ha", "har", "du", "etter",
  "ser", "leter", "trenger", "kul", "kule", "fin", "fine", "nice", "litt", "helst", "gjerne", "the", "a", "and", "of",
  "min", "mitt", "mine", "meg", "kan", "skal", "være", "er", "det", "den", "de", "av", "bra", "god", "gode", "ny", "nye",
  "kr", "kroner", "nok", "pris", "eller", "også", "veldig", "type", "slags", "sånn", "sånne", "ting", "klær", "plagg",
]);

const LETTER_SIZES = ["xxxl", "xxl", "xl", "xs", "s", "m", "l"];
const SHOE_SIZE_TABLE: string[][] = [
  ["35", "4", "2.5", "2"], ["36", "4.5", "3", "3.5"], ["37", "5", "4", "4.5"], ["38", "5.5", "4.5", "5"],
  ["39", "6", "5", "6"], ["40", "6.5", "5.5", "6.5"], ["41", "7.5", "6.5", "7.5"], ["42", "8", "7", "8"],
  ["43", "9", "8", "9"], ["44", "9.5", "8.5", "9.5"], ["45", "10.5", "9.5", "10.5"], ["46", "11", "10", "11"],
  ["47", "11.5", "10.5", "12"], ["48", "12.5", "11.5", "13"],
];

// ---------- Hjelpere ----------

// «gensere» -> ["gensere", "genser"], «jakkene» -> ["jakkene", "jakke"]
function stems(word: string): string[] {
  const out = new Set([word]);
  for (const end of ["ene", "ane", "ne", "er", "en", "et", "e", "a", "r", "s"]) {
    if (word.endsWith(end) && word.length - end.length >= 3) out.add(word.slice(0, -end.length));
  }
  return Array.from(out);
}

// Antall skrivefeil mellom to ord (bytte, mangler, ekstra bokstav, eller to ombyttede bokstaver).
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// Er ordet (eller en bøyning av det) et ord i lista?
function exactIn(word: string, list: string[]): boolean {
  return stems(word).some((f) => list.includes(f));
}

// Tåler skrivefeil («hodie» -> «hoodie»): finner typen med ordet som ligner mest.
// Brukes bare når ingen type passet eksakt.
function closestType(word: string): (typeof TYPES)[number] | undefined {
  if (word.length < 4) return undefined;
  const maxDist = word.length >= 7 ? 2 : 1;
  let best: { type: (typeof TYPES)[number]; dist: number } | undefined;
  for (const type of TYPES) {
    for (const w of type.words) {
      if (w.length < 4) continue;
      const dist = Math.min(...stems(word).map((f) => editDistance(f, w)));
      if (dist <= maxDist && (!best || dist < best.dist)) best = { type, dist };
    }
  }
  return best?.type;
}

// Finnes ordet i produktteksten? Korte ord må stå som egne ord («tee» skal ikke treffe «tees»-fri tekst som «steel»).
function textHas(text: string, word: string): boolean {
  if (word.length >= 5) return text.includes(word);
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zæøå0-9])${escaped}`, "i").test(text);
}

function formatKr(n: number) {
  return `${n.toLocaleString("nb-NO")} kr`;
}

// ---------- Tolking ----------

export function parseSmartQuery(input: string): SmartQuery {
  // «t skjorte» / «t shirt» -> «t-skjorte» / «t-shirt»
  let q = ` ${input.toLowerCase().replace(/\bt\s+(skjorte|skjorter|shirt|shirts)\b/g, "t-$1")} `;
  const result: SmartQuery = { groups: [], colors: [], styles: [], minPrice: null, maxPrice: null, sizes: [], gender: null, summary: "" };

  // Pris
  const between = q.match(/mellom\s+(\d+)\s*(?:kr)?\s+og\s+(\d+)/);
  if (between) {
    result.minPrice = +between[1];
    result.maxPrice = +between[2];
    q = q.replace(between[0], " ");
  }
  const under = q.match(/(?:under|maks(?:imum)?|mindre enn|opptil|billigere enn)\s+(\d+)/);
  if (under) {
    result.maxPrice = +under[1];
    q = q.replace(under[0], " ");
  }
  const over = q.match(/(?:over|minst|mer enn|dyrere enn)\s+(\d+)/);
  if (over) {
    result.minPrice = +over[1];
    q = q.replace(over[0], " ");
  }
  if (/\b(billig|billige|billigst|rimelig|rimelige|budsjett)\b/.test(q)) {
    if (result.maxPrice === null) result.maxPrice = 500;
    q = q.replace(/\b(billig|billige|billigst|rimelig|rimelige|budsjett)\b/g, " ");
  }

  // Størrelse
  const size = q.match(/\s(?:str\.?|størrelse|size)\s*(xxxl|xxl|xl|xs|s|m|l|\d{1,2}(?:[.,]5)?)(?=\s)/);
  if (size) {
    const raw = size[1].replace(",", ".");
    result.sizes = /^\d+(\.\d+)?$/.test(raw) ? SHOE_SIZE_TABLE.find((r) => r.includes(raw)) ?? [raw] : [raw];
    q = q.replace(size[0], "  ");
  } else {
    const letter = q.split(/\s+/).find((w) => LETTER_SIZES.includes(w) && w.length > 1);
    if (letter) {
      result.sizes = [letter];
      q = q.replace(new RegExp(`\\s${letter}\\s`), " ");
    }
  }

  // Stil (old money, sos, streetwear …)
  const { style, rest } = extractStyle(q);
  if (style) {
    result.styles.push(style.slug);
    q = ` ${rest} `;
  }

  // Ord for ord
  const words = q.replace(/[^a-zæøå0-9\- ]/g, " ").split(/\s+/).filter(Boolean);
  const usedTypes = new Set<string>();
  for (const word of words) {
    if (STOPWORDS.has(word) || /^\d+$/.test(word)) continue;

    const gender = GENDERS.find((g) => g.words.includes(word));
    if (gender) {
      result.gender = gender.gender;
      continue;
    }
    const color = COLORS.find((c) => c.words.includes(word));
    if (color) {
      if (!result.colors.includes(color)) result.colors.push(color);
      continue;
    }
    const concept = CONCEPTS.find((c) => exactIn(word, c.triggers));
    if (concept) {
      if (!result.groups.some((g) => g.label === concept.label)) {
        result.groups.push({ label: concept.label, words: concept.words, soft: true });
        if (concept.style && !result.styles.includes(concept.style)) result.styles.push(concept.style);
      }
      continue;
    }
    const type = TYPES.find((t) => exactIn(word, t.words)) ?? closestType(word);
    if (type) {
      if (!usedTypes.has(type.label)) {
        usedTypes.add(type.label);
        result.groups.push({ label: type.label, words: type.words, soft: false, exclude: type.exclude });
      }
      continue;
    }
    // Ukjent ord (merke, motiv, «porsche» …): må finnes i produktet.
    result.groups.push({ label: word, words: stems(word), soft: false });
  }

  // Flere produkttyper («gensere og jakker») = ett av dem, ikke alle.
  const typeGroups = result.groups.filter((g) => usedTypes.has(g.label));
  if (typeGroups.length > 1) {
    result.groups = [
      ...result.groups.filter((g) => !usedTypes.has(g.label)),
      { label: typeGroups.map((g) => g.label).join(" eller "), words: typeGroups.flatMap((g) => g.words), soft: false },
    ];
  }
  // Konkret type + vagt ønske («varm jakke»): typen bestemmer, ønsket blir bare et hint.
  if (usedTypes.size > 0) result.groups = result.groups.filter((g) => !g.soft);

  result.summary = buildSummary(result);
  return result;
}

function buildSummary(q: SmartQuery): string {
  const parts: string[] = [];
  const styleLabels = q.styles.map((s) => STYLES.find((d) => d.slug === s)?.label).filter(Boolean);
  if (styleLabels.length) parts.push(styleLabels.join(", "));
  if (q.colors.length) parts.push(q.colors.map((c) => c.label).join(" eller "));
  if (q.groups.length) parts.push(q.groups.map((g) => g.label).join(", "));
  if (q.gender) parts.push(q.gender === "herre" ? "til herre" : "til dame");
  if (q.sizes.length) parts.push(`str. ${q.sizes[0].toUpperCase()}`);
  if (q.minPrice !== null && q.maxPrice !== null) parts.push(`${formatKr(q.minPrice)}–${formatKr(q.maxPrice)}`);
  else if (q.maxPrice !== null) parts.push(`under ${formatKr(q.maxPrice)}`);
  else if (q.minPrice !== null) parts.push(`over ${formatKr(q.minPrice)}`);
  return parts.length ? `Viser ${parts.join(" · ")}` : "";
}

// ---------- Matching ----------

// strict=false: dropper farge, størrelse og vage ønsker hvis søket ellers gir null treff.
export function matchesSmartQuery(p: Product, q: SmartQuery, price: number, strict = true): boolean {
  const text = `${p.title} ${p.category} ${p.vendor} ${p.tags.join(" ")}`.toLowerCase();
  for (const g of q.groups) {
    if (!strict && g.soft) continue;
    if (!g.words.some((w) => textHas(text, w))) return false;
    if (g.exclude?.some((w) => textHas(text, w))) return false;
  }
  if (q.styles.length && !q.styles.some((s) => (p.styles || []).includes(s))) return false;
  if (q.minPrice !== null && price < q.minPrice) return false;
  if (q.maxPrice !== null && price > q.maxPrice) return false;
  if (q.gender && ![q.gender, "unisex"].includes(detectGender(p))) return false;
  if (strict) {
    if (q.colors.length && !q.colors.some((c) => c.words.some((w) => textHas(text, w)))) return false;
    if (q.sizes.length && !(p.sizes || []).some((s) => q.sizes.some((opt) => s.toLowerCase().includes(opt.toLowerCase())))) return false;
  }
  return true;
}
