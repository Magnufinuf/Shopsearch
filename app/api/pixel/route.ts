import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Kjøp meldt fra Scavenger-pikselen (public/pixel.js) på butikkens «takk for kjøpet»-side.
const bare = (h: string) => h.toLowerCase().replace(/^www\./, "");

const recent = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > 30;
}

export async function POST(request: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "ukjent";
  if (rateLimited(ip)) return done;
  try {
    const body = JSON.parse(await request.text());
    const store = String(body.store || "").toLowerCase();
    const orderId = String(body.orderId || "").slice(0, 100);
    const amount = Number(body.amount);
    const currency = String(body.currency || "NOK").toUpperCase();
    if (!store || !orderId || !isFinite(amount) || amount <= 0 || amount > 1_000_000 || !/^[A-Z]{3}$/.test(currency)) return done;

    // Kjøpet må komme fra butikkens egen nettside.
    const origin = request.headers.get("origin");
    if (origin && bare(new URL(origin).hostname) !== bare(store)) return done;

    const { data: stores } = await supabase.from("stores").select("store_domain").in("store_domain", [store, bare(store), `www.${bare(store)}`]);
    const storeDomain = stores?.[0]?.store_domain;
    if (!storeDomain) return done;

    await supabase.from("scavenger_sales").upsert(
      { store_domain: storeDomain, order_id: orderId, amount, currency },
      { onConflict: "store_domain,order_id", ignoreDuplicates: true }
    );
  } catch {
    // Pikselen skal aldri feile synlig.
  }
  return done;
}
