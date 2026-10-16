import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAllProducts } from "@/lib/products";
import { detectGender } from "@/lib/categories";
import { fallbackStoreName, getStoreProfiles } from "@/lib/store-names";

export async function GET() {
  const { data, error } = await supabase
    .from("adverts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Antall kommentarer per annonse. Feiler stille (f.eks. før tabellen finnes), så feeden alltid virker.
  const counts = new Map<string, number>();
  const { data: comments } = await supabase.from("advert_comments").select("advert_id");
  for (const c of comments || []) {
    const key = String(c.advert_id);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  // Produktannonser får pris, stil og kjønn fra produktet, så de kan filtreres.
  const hasProducts = (data || []).some((a) => a.product_url);
  const products = hasProducts ? await getAllProducts().catch(() => []) : [];
  const byUrl = new Map(products.map((p) => [p.url, p]));
  const profiles = await getStoreProfiles((data || []).map((a) => a.store_domain));

  return NextResponse.json({
    adverts: (data || []).map((a) => {
      const product = a.product_url ? byUrl.get(a.product_url) : undefined;
      return {
        ...a,
        comment_count: counts.get(String(a.id)) || 0,
        store_name: profiles.get(a.store_domain)?.name || fallbackStoreName(a.store_domain),
        store_logo: profiles.get(a.store_domain)?.logo || null,
        ...(product
          ? {
              product_price: product.price,
              product_currency: product.currency,
              styles: product.styles || [],
              gender: detectGender(product),
            }
          : {}),
      };
    }),
  });
}
