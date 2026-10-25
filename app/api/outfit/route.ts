import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAllProducts } from "@/lib/products";
import { categorizeProduct, detectGender, type Product } from "@/lib/categories";
import { isSupportedLang, languageName } from "@/lib/i18n/languages";

// AI-outfit: Claude setter sammen hele antrekk (topp, bukse, sko osv.) av produkter fra ulike butikker.
// Krever ANTHROPIC_API_KEY. Uten den svarer ruten 503.

const MODEL = process.env.AI_SEARCH_MODEL || "claude-opus-5-5";
const MAX_PROMPT = 300;
const MAX_CATALOG = 500;

export const maxDuration = 60;

const SYSTEM = `Du er stylist i Scavenger, en norsk søkemotor for klær og tilbehør fra mange nettbutikker.
Brukeren beskriver et antrekk de ønsker. Sett sammen 1–3 komplette outfits av produktene i <catalog>.

Hver linje i katalogen er: id | tittel | kategori | kjønn | stiler | pris | butikk

Regler:
- Bruk BARE id-er som står i katalogen. Ikke finn på produkter.
- Hver outfit har 2–5 plagg/tilbehør, f.eks. topp, underdel, sko og eventuelt ytterplagg eller tilbehør.
  Ikke to plagg med samme rolle (f.eks. to par sko) i samme outfit.
- Bland gjerne produkter fra ulike butikker i hver outfit.
- Respekter budsjett (summen av prisene i en outfit skal være under budsjettet), kjønn, anledning og stil.
- Ingen interiørprodukter.
- role: kort rollenavn på samme språk som tittelen, f.eks. "Topp", "Bukse", "Sko", "Jakke", "Tilbehør".
- title: kort og fengende navn på outfiten. description: én setning om hvorfor den passer.
  Skriv title, description og role på språket som står i <language>.
- Finnes det ikke nok passende produkter, lag færre outfits (eller ingen).`;

const SCHEMA = {
  type: "object",
  properties: {
    outfits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { id: { type: "string" }, role: { type: "string" } },
              required: ["id", "role"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "description", "items"],
        additionalProperties: false,
      },
    },
  },
  required: ["outfits"],
  additionalProperties: false,
};

type RawOutfit = { title: string; description: string; items: { id: string; role: string }[] };

function priceText(p: Product): string {
  const nok = p.localPrices?.NOK;
  return nok !== undefined ? `${Math.round(nok)} NOK` : `${p.price} ${p.currency}`;
}

function catalogLine(p: Product): string {
  const clean = (s: string) => s.replace(/[|\n\r]+/g, " ").trim();
  return [p.id, clean(p.title), categorizeProduct(p), detectGender(p), (p.styles || []).join(",") || "-", priceText(p), clean(p.vendor)].join(" | ");
}

// Maks ~500 produkter til Claude. Er det flere, velges de som passer best med ordene i ønsket.
function pickCatalog(products: Product[], prompt: string): Product[] {
  const usable = products.filter((p) => categorizeProduct(p) !== "interior");
  if (usable.length <= MAX_CATALOG) return usable;
  const words = prompt
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3);
  if (words.length === 0) return usable.slice(0, MAX_CATALOG);
  const scored = usable.map((p, i) => {
    const text = `${p.title} ${p.category} ${p.tags.join(" ")} ${(p.styles || []).join(" ")}`.toLowerCase();
    return { p, i, score: words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0) };
  });
  // Treff først, ellers rekkefølgen fra katalogen (stabil sortering).
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored.slice(0, MAX_CATALOG).map((s) => s.p);
}

async function compose(prompt: string, lang: string, catalog: Product[]): Promise<RawOutfit[] | null> {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    ...(MODEL.includes("haiku") ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }),
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text" as const,
            text: `<catalog>\n${catalog.map(catalogLine).join("\n")}\n</catalog>\n<language>${lang === "no" ? "norsk" : languageName(lang, "en")}</language>\n<request>${prompt}</request>`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") return null;
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  const parsed = JSON.parse(text.text) as { outfits?: RawOutfit[] };
  return Array.isArray(parsed.outfits) ? parsed.outfits : null;
}

// Enkel sperre mot misbruk: maks 10 outfits i minuttet per IP (per server-instans).
const recent = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > 10;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI-outfit er ikke satt opp." }, { status: 503 });
  }

  let body: { prompt?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > MAX_PROMPT) {
    return NextResponse.json({ error: "Beskriv outfiten med 1–300 tegn." }, { status: 400 });
  }
  const lang = isSupportedLang(body.lang) ? body.lang : "no";

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "ukjent";
  if (rateLimited(ip)) return NextResponse.json({ error: "For mange forespørsler, vent litt." }, { status: 429 });

  try {
    const catalog = pickCatalog(await getAllProducts(), prompt);
    if (catalog.length === 0) return NextResponse.json({ outfits: [] });

    const raw = await compose(prompt, lang, catalog);
    if (!raw) return NextResponse.json({ error: "Kunne ikke sette sammen outfit." }, { status: 502 });

    const byId = new Map(catalog.map((p) => [p.id, p]));
    const outfits = raw
      .map((o) => {
        const seen = new Set<string>();
        const items = (Array.isArray(o.items) ? o.items : [])
          .filter((it) => {
            if (!it || typeof it.id !== "string" || !byId.has(it.id) || seen.has(it.id)) return false;
            seen.add(it.id);
            return true;
          })
          .slice(0, 5)
          .map((it) => ({ role: String(it.role || "").slice(0, 40), product: byId.get(it.id)! }));
        return { title: String(o.title || "").slice(0, 120), description: String(o.description || "").slice(0, 400), items };
      })
      .filter((o) => o.items.length >= 2)
      .slice(0, 3);

    return NextResponse.json({ outfits });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "AI-en er travel, prøv igjen." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`AI-outfit feilet (${error.status}):`, error.message);
    } else {
      console.error("AI-outfit feilet:", error);
    }
    return NextResponse.json({ error: "AI-outfit feilet." }, { status: 502 });
  }
}
