import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { EN } from "@/lib/i18n/en";
import { TRANSLATION_VERSION, isSupportedLang, languageName } from "@/lib/i18n/languages";

// Oversetter nettsiden til et språk med Claude første gang noen velger det.
// Svaret lagres i 30 dager, så hvert språk oversettes bare én gang.
// Krever ANTHROPIC_API_KEY i Vercel. Uten den vises engelsk.

export const maxDuration = 120;

const MODEL = process.env.AI_SEARCH_MODEL || "claude-opus-5-5";
const CHUNK = 60; // tekster per kall, flere kall går samtidig

const SCHEMA = {
  type: "object",
  properties: { translations: { type: "array", items: { type: "string" } } },
  required: ["translations"],
  additionalProperties: false,
};

// Plassholdere som {antall} må stå uendret i oversettelsen.
function placeholders(text: string) {
  return (text.match(/\{[^}]+\}/g) || []).sort().join();
}

async function translateChunk(client: Anthropic, language: string, texts: string[]): Promise<string[]> {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    ...(MODEL.includes("haiku") ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }),
    system: `You translate the user interface of Scavenger, a shopping search engine for clothes and accessories from many online stores.
Translate each English text to ${language}. Keep it short and natural, like a modern shopping app.
Keep placeholders in curly braces (like {antall}) exactly as they are. Keep "Scavenger" untranslated.
Return the translations in the same order, one per input text.`,
    messages: [{ role: "user", content: JSON.stringify(texts) }],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("Tomt svar");
  const out = JSON.parse(text.text).translations as string[];
  if (!Array.isArray(out) || out.length !== texts.length) throw new Error("Feil antall oversettelser");
  return out;
}

async function translateAll(lang: string): Promise<Record<string, string>> {
  const client = new Anthropic();
  const language = `${languageName(lang, "en")} (${lang})`;
  const entries = Object.entries(EN);
  const chunks: [string, string][][] = [];
  for (let i = 0; i < entries.length; i += CHUNK) chunks.push(entries.slice(i, i + CHUNK));

  const results = await Promise.all(chunks.map((chunk) => translateChunk(client, language, chunk.map(([, en]) => en))));
  const dict: Record<string, string> = {};
  chunks.forEach((chunk, c) =>
    chunk.forEach(([key, en], i) => {
      const translated = results[c][i];
      // Mangler en plassholder, brukes engelsk for den teksten.
      dict[key] = typeof translated === "string" && translated && placeholders(translated) === placeholders(en) ? translated : en;
    })
  );
  return dict;
}

const translateCached = unstable_cache(translateAll, ["translations", TRANSLATION_VERSION, MODEL], { revalidate: 30 * 86400 });

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  if (!isSupportedLang(lang) || lang === "no") return NextResponse.json({ error: "Ukjent språk." }, { status: 400 });
  if (lang === "en") return NextResponse.json({ translations: EN });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Oversettelse er ikke satt opp." }, { status: 503 });

  try {
    const translations = await translateCached(lang);
    return NextResponse.json(
      { translations },
      // Samme versjon gir samme svar: la nettleseren og Vercel huske det.
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=2592000" } }
    );
  } catch (error) {
    console.error(`Oversettelse til ${lang} feilet:`, error);
    return NextResponse.json({ error: "Oversettelsen feilet." }, { status: 502 });
  }
}
