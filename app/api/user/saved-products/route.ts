import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";
import { getAllProducts } from "@/lib/products";

const notLoggedIn = () => NextResponse.json({ error: "Logg inn for å lagre produkter." }, { status: 401 });

// Et øyeblikksbilde av produktet lagres, så det kan vises på Min side selv om butikken endrer det.
type SavedProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  vendor: string;
  image: string;
  url: string;
  storeDomain?: string;
  shopifyProductId?: string;
};

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function cleanProduct(input: unknown): SavedProduct | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Record<string, unknown>;
  const id = str(p.id, 300);
  const url = str(p.url, 1000);
  if (!id || !/^https:\/\//.test(url)) return null;
  const image = str(p.image, 1000);
  return {
    id,
    title: str(p.title, 300),
    price: typeof p.price === "number" && isFinite(p.price) ? p.price : 0,
    currency: str(p.currency, 3) || "NOK",
    vendor: str(p.vendor, 200),
    image: /^https:\/\//.test(image) ? image : "",
    url,
    storeDomain: str(p.storeDomain, 255) || undefined,
    shopifyProductId: str(p.shopifyProductId, 100) || undefined,
  };
}

// Lagrede produkter for innlogget bruker, nyeste først.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return notLoggedIn();

  const { data, error } = await supabase
    .from("saved_products")
    .select("product")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ products: [] });

  // Vis dagens pris og bilde hvis produktet fortsatt finnes i butikken, ellers det som ble lagret.
  const current = new Map((await getAllProducts().catch(() => [])).map((p) => [p.id, p]));
  const products = (data || []).map((row) => {
    const saved = row.product as SavedProduct;
    const now = current.get(saved.id);
    return now
      ? { ...saved, title: now.title, price: now.price, currency: now.currency, localPrices: "localPrices" in now ? now.localPrices : undefined, image: now.image || saved.image, url: now.url }
      : saved;
  });
  return NextResponse.json({ products });
}

// { product, saved: true } lagrer, { product, saved: false } fjerner.
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return notLoggedIn();

  const { product: raw, saved } = await request.json().catch(() => ({}));
  const product = cleanProduct(raw);
  if (!product) return NextResponse.json({ error: "Ugyldig produkt" }, { status: 400 });

  const { error } = saved
    ? await supabase.from("saved_products").upsert({ user_id: userId, product_key: product.id, product })
    : await supabase.from("saved_products").delete().eq("user_id", userId).eq("product_key", product.id);

  if (error) {
    const missing = /saved_products/i.test(error.message);
    return NextResponse.json({ error: missing ? "Lagring av produkter er ikke slått på ennå." : "Noe gikk galt, prøv igjen." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
