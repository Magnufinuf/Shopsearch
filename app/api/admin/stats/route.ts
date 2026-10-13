import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";

const DAYS = 14;

// Statistikk for innlogget butikk: besøk Scavenger har sendt dem.
export async function GET() {
  const shop = await getSessionShop();
  if (!shop) return notLoggedIn();

  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [{ data, error }, { count: total }] = await Promise.all([
    supabase.from("product_clicks").select("product_id, created_at").eq("store_domain", shop).gte("created_at", since30).limit(20000),
    supabase.from("product_clicks").select("id", { count: "exact", head: true }).eq("store_domain", shop),
  ]);
  // Tabellen finnes ikke ennå (SQL ikke kjørt): vis tomt, ikke feil.
  if (error) return NextResponse.json({ ready: false, last7: 0, last30: 0, total: 0, daily: [], topProducts: [] });

  const now = Date.now();
  const rows = data || [];
  const last7 = rows.filter((r) => now - new Date(r.created_at).getTime() < 7 * 86400_000).length;

  // Besøk per dag de siste 14 dagene (norsk tid), eldste først.
  const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" }); // ÅÅÅÅ-MM-DD
  const daily = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(now - (DAYS - 1 - i) * 86400_000);
    return { date: dayKey(d), clicks: 0 };
  });
  const index = new Map(daily.map((d, i) => [d.date, i]));
  for (const r of rows) {
    const i = index.get(dayKey(new Date(r.created_at)));
    if (i !== undefined) daily[i].clicks++;
  }

  const perProduct = new Map<string, number>();
  for (const r of rows) if (r.product_id) perProduct.set(r.product_id, (perProduct.get(r.product_id) || 0) + 1);
  const topProducts = Array.from(perProduct, ([productId, clicks]) => ({ productId, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  return NextResponse.json({ ready: true, last7, last30: rows.length, total: total ?? rows.length, daily, topProducts });
}
