import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAllProducts } from "@/lib/products";

export async function GET() {
  const [products, { data: hidden }] = await Promise.all([
    getAllProducts(),
    // Skjulte produkter sjekkes hver gang, så «Skjul» virker med en gang.
    supabase.from("hidden_products").select("store_domain, product_id"),
  ]);

  if (products.length === 0) {
    return NextResponse.json({ error: "Ingen butikker registrert ennå.", products: [] }, { status: 200 });
  }

  const hiddenSet = new Set((hidden || []).map((h) => `${h.store_domain}-${h.product_id}`));
  return NextResponse.json({
    products: products.filter((p) => !hiddenSet.has(`${p.storeDomain}-${p.shopifyProductId}`)),
  });
}
