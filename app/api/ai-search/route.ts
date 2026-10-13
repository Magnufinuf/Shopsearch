import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { CATEGORIES } from "@/lib/categories";
import { STYLES } from "@/lib/styles";
import type { AiFilters } from "@/lib/ai-search";

// AI-søk: Claude gjør om det folk skriver («noe varmt til vinteren under 1000») til filtre.
// Selve søket i produktene skjer som før, i nettleseren.
// Krever ANTHROPIC_API_KEY i Vercel. Uten den svarer ruten 503, og siden bruker det vanlige søket.

const MODEL = process.env.AI_SEARCH_MODEL || "claude-opus-5-5";
const MAX_QUERY = 200;

const SYSTEM = `Du tolker søk i Scavenger, en norsk søkemotor for klær og tilbehør fra mange nettbutikker.
Gjør søket om til filtre. Folk skriver ofte uformelt, med slang og skrivefeil.

Regler:
- keywords: produkttyper og ord som kan stå i produkttittelen eller taggene. Ta med norske og engelske varianter
  (f.eks. "genser" -> ["genser", "sweater", "hoodie", "strikk"]). Ved vage ønsker ("noe varmt") velg konkrete typer.
  Tom liste hvis søket bare er en stil, farge eller pris.
- colors: farger på norsk og engelsk (f.eks. ["svart", "black"]).
- category: én av ${CATEGORIES.map((c) => `"${c.slug}"`).join(", ")}, eller null.
- styles: én eller flere av ${STYLES.map((s) => `"${s.slug}" (${s.label})`).join(", ")}. "Sossete"/"preppy" = "soss".
- minPrice/maxPrice: i norske kroner. "billig" uten tall = maxPrice 500. Ellers null.
- sizes: f.eks. ["M"] eller ["43"]. Tom liste hvis ingen.
- gender: "herre", "dame", "unisex" eller null.
- summary: én kort setning på norsk som forklarer hva du ser etter, f.eks. "Varme gensere og jakker under 1000 kr".`;

const SCHEMA = {
  type: "object",
  properties: {
    keywords: { type: "array", items: { type: "string" } },
    colors: { type: "array", items: { type: "string" } },
    category: { anyOf: [{ type: "string", enum: CATEGORIES.map((c) => c.slug) }, { type: "null" }] },
    styles: { type: "array", items: { type: "string", enum: STYLES.map((s) => s.slug) } },
    minPrice: { type: ["number", "null"] },
    maxPrice: { type: ["number", "null"] },
    sizes: { type: "array", items: { type: "string" } },
    gender: { anyOf: [{ type: "string", enum: ["herre", "dame", "unisex"] }, { type: "null" }] },
    summary: { type: "string" },
  },
  required: ["keywords", "colors", "category", "styles", "minPrice", "maxPrice", "sizes", "gender", "summary"],
  additionalProperties: false,
};

async function interpret(query: string): Promise<AiFilters | null> {
  // Lages her (ikke øverst i fila), så bygget ikke feiler når nøkkelen mangler.
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    // Enkel tolkeoppgave: lav innsats holder, og gjør det raskt og billig.
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    // Hvis modellen avslår et søk, prøver API-et automatisk en annen modell.
    // Finnes ikke for Haiku – der faller vi bare tilbake til det vanlige søket.
    ...(MODEL.includes("haiku") ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }),
    system: SYSTEM,
    messages: [{ role: "user", content: query }],
  });

  if (response.stop_reason === "refusal") return null;
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  return JSON.parse(text.text) as AiFilters;
}

// Samme søk gir samme svar, så vi lagrer tolkningen i et døgn (sparer tid og penger).
const interpretCached = unstable_cache(interpret, ["ai-search-v1", MODEL], { revalidate: 86400 });

// Enkel sperre mot misbruk: maks 20 AI-søk i minuttet per IP (per server-instans).
const recent = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > 20;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI-søk er ikke satt opp." }, { status: 503 });
  }

  const { query: raw } = await request.json();
  const query = String(raw || "").trim().toLowerCase().slice(0, MAX_QUERY);
  if (!query) return NextResponse.json({ error: "Tomt søk." }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "ukjent";
  if (rateLimited(ip)) return NextResponse.json({ error: "For mange søk, vent litt." }, { status: 429 });

  try {
    const filters = await interpretCached(query);
    if (!filters) return NextResponse.json({ error: "Kunne ikke tolke søket." }, { status: 502 });
    return NextResponse.json({ filters });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "AI-søket er travelt, prøv igjen." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`AI-søk feilet (${error.status}):`, error.message);
    } else {
      console.error("AI-søk feilet:", error);
    }
    return NextResponse.json({ error: "AI-søket feilet." }, { status: 502 });
  }
}
