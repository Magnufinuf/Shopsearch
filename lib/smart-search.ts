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
// words = ord vi leter etter i produktene. also = flere ord (andre språk) som betyr det samme i søket.
const TYPES: { label: string; words: string[]; also?: string[]; exclude?: string[] }[] = [
  // Hettegensere før gensere, så «hoodie» gir bare hoodies, mens «genser» også tar med hoodies.
  {
    label: "hettegensere",
    words: ["hoodie", "hettegenser", "hettejakke", "zip hoodie"],
    also: ["hoody", "luvtröja", "huvtröja", "hættetrøje", "kapuzenpullover", "kapuzenjacke", "sudadera con capucha", "capucha", "sweat à capuche", "felpa con cappuccio"],
  },
  {
    label: "gensere",
    words: ["genser", "sweater", "sweatshirt", "collegegenser", "strikk", "strikkegenser", "pullover", "crewneck", "halfzip", "half-zip", "quarter zip", "quarter-zip", "cardigan", "hoodie"],
    also: ["tröja", "tröjor", "trøje", "trøjer", "pulli", "pullunder", "strickpullover", "suéter", "sueter", "sudadera", "jersey", "pull", "maglione", "jumper", "knit", "knitwear"],
  },
  {
    label: "jakker",
    words: ["jakke", "jacket", "coat", "kåpe", "frakk", "dunjakke", "puffer", "parkas", "bomberjakke", "vest"],
    also: ["jacka", "jackor", "jakker", "jacke", "jacken", "mantel", "chaqueta", "abrigo", "veste", "blouson", "manteau", "giacca", "cappotto", "overcoat", "windbreaker"],
  },
  {
    label: "t-skjorter",
    words: ["t-skjorte", "tskjorte", "t-shirt", "tshirt", "tee"],
    also: ["t-tröja", "tröja kortärmad", "camiseta", "maglietta", "tee-shirt", "t shirt", "tees"],
    // «sweatshirt» inneholder «tshirt», så den holdes utenfor.
    exclude: ["sweatshirt"],
  },
  {
    label: "skjorter",
    words: ["skjorte", "shirt", "oxford", "flanell", "overshirt"],
    also: ["skjorta", "skjortor", "hemd", "hemden", "camisa", "chemise", "camicia", "button-down", "button down"],
    // «shirt» står også i «t-shirt», så t-skjorter holdes utenfor.
    exclude: ["t-shirt", "tshirt", "t-skjorte", "tskjorte", "sweatshirt"],
  },
  { label: "poloer", words: ["polo", "piké", "pique"], also: ["poloshirt", "pikétröja", "polohemd", "polo shirt"] },
  {
    label: "bukser",
    words: ["bukse", "pants", "trousers", "chinos", "chino", "jeans", "cargo", "joggebukse", "jogger", "sweatpants"],
    also: ["byxor", "byxa", "bukser", "hose", "hosen", "pantalones", "pantalón", "pantalon", "pantaloni", "slacks"],
  },
  { label: "jeans", words: ["jeans", "dongeri", "denim"], also: ["vaqueros", "jean"] },
  { label: "shorts", words: ["shorts"], also: ["kortbyxor", "kurze hose", "pantalones cortos", "bermuda", "pantaloncini"] },
  {
    label: "sko",
    words: ["sko", "shoes", "sneakers", "sneaker", "joggesko", "boots", "støvel", "støvler", "loafers", "loafer"],
    also: ["skor", "skon", "schuhe", "schuh", "zapatos", "zapatillas", "chaussures", "baskets", "scarpe", "trainers", "kicks", "footwear"],
  },
  {
    label: "luer og caps",
    words: ["caps", "cap", "lue", "lua", "beanie", "hatt", "hat", "bøttehatt", "bucket hat"],
    also: ["keps", "mössa", "hue", "kasket", "mütze", "kappe", "gorra", "gorro", "casquette", "bonnet", "cappello", "berretto"],
  },
  { label: "kjoler", words: ["kjole", "dress"], also: ["klänning", "kleid", "vestido", "robe", "vestito", "abito"] },
  { label: "skjørt", words: ["skjørt", "skirt"], also: ["kjol", "nederdel", "rock", "falda", "jupe", "gonna"] },
  {
    label: "vesker",
    words: ["veske", "bag", "sekk", "ryggsekk", "tote", "bæreveske"],
    also: ["väska", "ryggsäck", "taske", "rygsæk", "tasche", "rucksack", "bolso", "mochila", "sac", "sac à dos", "borsa", "zaino", "backpack"],
  },
  { label: "sokker", words: ["sokker", "sokk", "socks"], also: ["strumpor", "strømper", "socken", "calcetines", "chaussettes", "calzini"] },
  { label: "undertøy", words: ["undertøy", "boxer", "truse", "underwear", "bh"], also: ["underkläder", "undertøj", "unterwäsche", "ropa interior", "sous-vêtements", "boxershorts"] },
  {
    label: "smykker",
    words: ["smykke", "kjede", "halskjede", "armbånd", "øredobber", "jewelry", "necklace", "bracelet"],
    also: ["smycke", "smykker", "schmuck", "kette", "joyas", "collar", "bijoux", "collier", "gioielli", "jewellery", "ring", "earrings"],
  },
  { label: "skjerf", words: ["skjerf", "scarf"], also: ["halsduk", "tørklæde", "schal", "bufanda", "écharpe", "sciarpa"] },
  { label: "hansker", words: ["hansker", "votter", "gloves"], also: ["handskar", "vanter", "handschuhe", "guantes", "gants", "guanti"] },
  { label: "belter", words: ["belte", "belt"], also: ["bälte", "bælte", "gürtel", "cinturón", "ceinture", "cintura"] },
  { label: "tights", words: ["tights", "leggings"], also: ["mallas", "leggins"] },
  { label: "plakater", words: ["poster", "plakat", "canvas", "print"], also: ["affisch", "tavla", "cartel", "affiche", "wall art"] },
];

// Vage ønsker -> produkttyper/ord. soft = kan droppes hvis søket gir null treff.
const CONCEPTS: { triggers: string[]; label: string; words: string[]; style?: string }[] = [
  {
    triggers: [
      "varm", "varmt", "varme", "vinter", "vinteren", "kald", "kaldt", "kulde", "vinterklær",
      "warm", "winter", "cold", "cozy", "cosy", "vintern", "kallt", "varma", "kalt", "winterlich", "caliente", "abrigado", "invierno", "frío", "chaud", "hiver", "froid", "caldo", "inverno", "freddo",
    ],
    label: "varme plagg",
    words: ["genser", "sweater", "sweatshirt", "strikk", "hoodie", "hettegenser", "jakke", "jacket", "dunjakke", "puffer", "fleece", "ull", "wool", "lue", "beanie", "skjerf", "hansker", "votter", "cardigan"],
  },
  {
    triggers: ["sommer", "sommeren", "sol", "strand", "ferie", "sommerklær", "summer", "beach", "holiday", "sommar", "verano", "playa", "été", "plage", "estate", "spiaggia"],
    label: "sommerklær",
    words: ["t-skjorte", "t-shirt", "tee", "shorts", "singlet", "polo", "lin", "linen", "caps", "cap"],
  },
  {
    triggers: ["fest", "festlig", "pent", "pen", "pene", "bryllup", "date", "julebord", "konfirmasjon", "bursdag", "middag", "party", "wedding", "formal", "dinner", "elegant", "bröllop", "feier", "hochzeit", "fiesta", "boda", "fête", "soirée", "mariage", "festa", "matrimonio"],
    label: "pene klær",
    words: ["skjorte", "shirt", "kjole", "blazer", "polo", "loafers", "chinos", "oxford"],
  },
  {
    triggers: ["trening", "trene", "gym", "løping", "løpe", "sport", "treningsklær", "training", "workout", "running", "fitness", "träning", "löpning", "laufen", "deporte", "entrenamiento", "correr", "sportif", "allenamento"],
    label: "treningsklær",
    words: ["shorts", "tights", "t-skjorte", "t-shirt", "tee", "track", "jogger", "sports"],
    style: "sporty",
  },
  {
    triggers: ["bil", "biler", "bilen", "bilklær", "motor", "racing", "rally", "car", "cars", "auto", "bilar", "coche", "coches", "voiture", "macchina"],
    label: "bilmotiver",
    words: ["car", "cars", "bil", "porsche", "bmw", "audi", "ferrari", "mercedes", "nissan", "toyota", "racing", "speed", "motor", "gt"],
  },
  {
    triggers: ["regn", "regnvær", "vått", "vind", "rain", "rainy", "wind", "regnet", "regen", "lluvia", "pluie", "pioggia"],
    label: "regntøy",
    words: ["regnjakke", "skalljakke", "shell", "gore-tex", "anorak", "vindjakke"],
  },
];

const COLORS: { label: string; words: string[]; also?: string[] }[] = [
  { label: "svart", words: ["svart", "svarte", "sort", "sorte", "black"], also: ["svarta", "schwarz", "negro", "negra", "noir", "noire", "nero"] },
  { label: "hvit", words: ["hvit", "hvite", "hvitt", "white", "offwhite", "off-white"], also: ["vit", "vita", "hvid", "weiß", "weiss", "blanco", "blanca", "blanc", "blanche", "bianco"] },
  { label: "grå", words: ["grå", "grått", "grey", "gray"], also: ["grau", "gris", "grigio"] },
  { label: "blå", words: ["blå", "blått", "blue", "navy", "marine", "marineblå"], also: ["blåa", "blau", "azul", "bleu", "blu"] },
  { label: "rød", words: ["rød", "røde", "rødt", "red", "burgunder", "bordeaux"], also: ["röd", "röda", "rot", "rojo", "roja", "rouge", "rosso"] },
  { label: "grønn", words: ["grønn", "grønne", "grønt", "green", "oliven", "olive"], also: ["grön", "gröna", "grøn", "grün", "verde", "vert"] },
  { label: "beige", words: ["beige", "sand", "creme", "krem", "cream", "khaki"], also: ["crème"] },
  { label: "brun", words: ["brun", "brune", "brunt", "brown"], also: ["bruna", "braun", "marrón", "marron", "marrone"] },
  { label: "rosa", words: ["rosa", "pink"], also: ["rose"] },
  { label: "gul", words: ["gul", "gule", "gult", "yellow"], also: ["gula", "gelb", "amarillo", "jaune", "giallo"] },
  { label: "lilla", words: ["lilla", "purple"], also: ["lila", "violett", "morado", "violet", "viola"] },
  { label: "oransje", words: ["oransje", "orange"], also: ["naranja", "arancione"] },
];

const GENDERS: { gender: "herre" | "dame"; words: string[] }[] = [
  {
    gender: "herre",
    words: ["herre", "herrer", "mann", "menn", "gutt", "gutter", "gutta", "men", "mens", "man", "male", "guy", "guys", "boy", "boys", "herr", "herrar", "kille", "killar", "dreng", "herren", "männer", "hombre", "hombres", "chico", "homme", "hommes", "uomo"],
  },
  {
    gender: "dame",
    words: ["dame", "damer", "kvinne", "kvinner", "jente", "jenter", "jentene", "women", "womens", "woman", "female", "girl", "girls", "dam", "damen", "tjej", "tjejer", "pige", "piger", "frauen", "mädchen", "mujer", "mujeres", "chica", "femme", "femmes", "donna"],
  },
];

const STOPWORDS = new Set([
  "noe", "noen", "til", "en", "et", "ei", "med", "for", "og", "i", "på", "som", "jeg", "vil", "ha", "har", "du", "etter",
  "ser", "leter", "trenger", "kul", "kule", "fin", "fine", "nice", "litt", "helst", "gjerne", "the", "a", "and", "of",
  "min", "mitt", "mine", "meg", "kan", "skal", "være", "er", "det", "den", "de", "av", "bra", "god", "gode", "ny", "nye",
  "kr", "kroner", "nok", "pris", "eller", "også", "veldig", "type", "slags", "sånn", "sånne", "ting", "klær", "plagg",
  // engelsk
  "something", "some", "want", "need", "looking", "look", "with", "to", "an", "my", "me", "please", "good", "new", "clothes", "clothing", "in", "on", "that", "is", "are", "or",
  // svensk / dansk
  "något", "nogen", "noget", "och", "att", "jag", "vill", "har", "söker", "kläder", "tøj", "med", "til",
  // tysk / spansk / fransk
  "etwas", "für", "ich", "möchte", "suche", "mit", "und", "kleidung", "algo", "para", "quiero", "busco", "con", "y", "ropa", "un", "una", "quelque", "chose", "pour", "je", "veux", "cherche", "avec", "et", "vêtements", "une",
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
    for (const w of [...type.words, ...(type.also || [])]) {
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

// Ordforråd fra produktene (titler, tagger, kategorier), brukes til å rette skrivefeil som «porshe» -> «porsche».
export function buildVocabulary(products: Product[]): string[] {
  const words = new Set<string>();
  for (const p of products) {
    for (const w of `${p.title} ${p.category} ${p.tags.join(" ")}`.toLowerCase().split(/[^a-zæøåäöüéèàáíóúñç0-9-]+/)) {
      if (w.length >= 4 && !/^\d+$/.test(w)) words.add(w);
    }
  }
  return Array.from(words);
}

// Nærmeste ord i produktenes ordforråd, eller null hvis ingen ligner nok.
function closestVocabWord(word: string, vocab: string[]): string | null {
  if (word.length < 4) return null;
  const maxDist = word.length >= 7 ? 2 : 1;
  let best: { w: string; d: number } | null = null;
  for (const w of vocab) {
    const d = editDistance(word, w);
    if (d <= maxDist && (!best || d < best.d)) best = { w, d };
  }
  return best?.w ?? null;
}

export function parseSmartQuery(input: string, vocab: string[] = []): SmartQuery {
  // «t skjorte», «t shirt» og skrivefeil som «t shorte» -> «t-skjorte»
  let q = ` ${input.toLowerCase().replace(/(^|\s)t[\s-]+([a-zæøå]+)/g, (match, pre: string, word: string) =>
    ["skjorte", "skjorter", "shirt", "shirts"].some((w) => editDistance(word, w) <= 2) ? `${pre}t-skjorte` : match
  )} `;
  const result: SmartQuery = { groups: [], colors: [], styles: [], minPrice: null, maxPrice: null, sizes: [], gender: null, summary: "" };

  // Pris
  const between = q.match(/(?:mellom|between|zwischen|entre|mellan)\s+(\d+)\s*(?:kr|nok)?\s+(?:og|and|und|y|et|och)\s+(\d+)/);
  if (between) {
    result.minPrice = +between[1];
    result.maxPrice = +between[2];
    q = q.replace(between[0], " ");
  }
  const under = q.match(/(?:under|maks(?:imum)?|mindre enn|opptil|billigere enn|below|less than|max|cheaper than|unter|bis|menos de|moins de|sotto|högst)\s+(\d+)/);
  if (under) {
    result.maxPrice = +under[1];
    q = q.replace(under[0], " ");
  }
  const over = q.match(/(?:over|minst|mer enn|dyrere enn|above|more than|at least|über|ab|más de|plus de|sopra|minst)\s+(\d+)/);
  if (over) {
    result.minPrice = +over[1];
    q = q.replace(over[0], " ");
  }
  const CHEAP = /(^|\s)(billig|billige|billigst|rimelig|rimelige|budsjett|cheap|cheapest|budget|affordable|billiga|billigt|günstig|barato|barata|económico|pas cher|economico)(?=\s)/g;
  if (CHEAP.test(q)) {
    if (result.maxPrice === null) result.maxPrice = 500;
    q = q.replace(CHEAP, " ");
  }

  // Størrelse
  const size = q.match(/\s(?:str\.?|størrelse|size|storlek|größe|grösse|talla|taille|taglia)\s*(xxxl|xxl|xl|xs|s|m|l|\d{1,2}(?:[.,]5)?)(?=\s)/);
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

  // Produkttyper på flere ord («bucket hat», «sudadera con capucha»)
  const usedTypes = new Set<string>();
  for (const type of TYPES) {
    for (const phrase of [...type.words, ...(type.also || [])].filter((w) => w.includes(" "))) {
      if (q.includes(` ${phrase} `)) {
        q = q.replace(` ${phrase} `, " ");
        if (!usedTypes.has(type.label)) {
          usedTypes.add(type.label);
          result.groups.push({ label: type.label, words: type.words, soft: false, exclude: type.exclude });
        }
      }
    }
  }

  // Ord for ord
  const words = q.replace(/[^a-zæøåäöüéèàáíóúñç0-9\- ]/g, " ").split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (STOPWORDS.has(word) || /^\d+$/.test(word)) continue;

    const gender = GENDERS.find((g) => g.words.includes(word));
    if (gender) {
      result.gender = gender.gender;
      continue;
    }
    const color = COLORS.find((c) => c.words.includes(word) || (c.also || []).includes(word));
    if (color) {
      if (!result.colors.some((c) => c.label === color.label)) {
        result.colors.push({ label: color.label, words: [...color.words, ...(color.also || [])] });
      }
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
    const type = TYPES.find((t) => exactIn(word, [...t.words, ...(t.also || [])])) ?? closestType(word);
    if (type) {
      if (!usedTypes.has(type.label)) {
        usedTypes.add(type.label);
        result.groups.push({ label: type.label, words: type.words, soft: false, exclude: type.exclude });
      }
      continue;
    }
    // Ukjent ord (merke, motiv, «porsche» …): må finnes i produktet.
    // Finnes det ikke, men ligner et ord i produktene («porshe»), brukes det ordet.
    const known = stems(word).some((f) => vocab.some((v) => v.includes(f)));
    const corrected = !known && vocab.length ? closestVocabWord(word, vocab) : null;
    result.groups.push(corrected ? { label: corrected, words: [corrected], soft: false } : { label: word, words: stems(word), soft: false });
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
