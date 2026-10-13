import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const SOURCES = ["forside", "sok", "kategori", "annonse", "lagret"];

// Enkel sperre mot at noen blåser opp tallene: maks 60 klikk i minuttet per IP.
const recent = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > 60;
}

// Registrerer et besøk Scavenger sendte til en butikk.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "ukjent";
  if (rateLimited(ip)) return new NextResponse(null, { status: 204 });

  try {
    const { storeDomain, productId, source } = await request.json();
    if (typeof storeDomain !== "string" || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(storeDomain)) {
      return new NextResponse(null, { status: 204 });
    }
    await supabase.from("product_clicks").insert({
      store_domain: storeDomain.toLowerCase(),
      product_id: typeof productId === "string" && /^\d+$/.test(productId) ? productId : null,
      source: SOURCES.includes(source) ? source : "sok",
    });
  } catch {
    // Feil her skal aldri merkes av brukeren.
  }
  return new NextResponse(null, { status: 204 });
}
