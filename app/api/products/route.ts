import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type ShopifyVariant = {
  id: string;
  title: string;
  sku: string;
  price: string;
};

type ShopifyProduct = {
  id: number;
  title: string;
  product_type: string;
  vendor: string;
  tags: string;
  handle: string;
  images: { src: string }[];
  variants: ShopifyVariant[];
};

type Store = {
  store_domain: string;
  client_id: string;
  client_secret: string;
  display_name: string | null;
};

async function getShopCurrency(domain: string, token: string): Promise<string> {
  try {
    const res = await fetch(`https://${domain}/admin/api/2024-10/shop.json`, {
      headers: { "X-Shopify-Access-Token": token },
      cache: "no-store",
    });
    if (!res.ok) return "USD";
    const data = await res.json();
    return data.shop?.currency || "USD";
  } catch {
    return "USD";
  }
}

async function fetchProductsForStore(store: Store) {
  try {
    const token = store.client_secret;
    if (!token) return [];

    const [productsRes, currency] = await Promise.all([
      fetch(`https://${store.store_domain}/admin/api/2024-10/products.json?limit=50`, {
        headers: { "X-Shopify-Access-Token": token },
        cache: "no-store",
      }),
      getShopCurrency(store.store_domain, token),
    ]);

    if (!productsRes.ok) return [];

    const data = await productsRes.json();
    return (data.products as ShopifyProduct[]).map((p) => ({
      id: `${store.store_domain}-${p.id}`,
      title: p.title,
      price: parseFloat(p.variants[0]?.price ?? "0"),
      currency,
      category: p.product_type,
      vendor: store.display_name || p.vendor,
      tags: p.tags ? p.tags.split(",").map((t) => t.trim()) : [],
      image: p.images[0]?.src ?? "",
      sizes: p.variants.map((v) => v.title),
      url: `https://${store.store_domain}/products/${p.handle}`,
      storeDomain: store.store_domain,
      shopifyProductId: String(p.id),
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  const { data: stores, error } = await supabase
    .from("stores")
    .select("store_domain, client_id, client_secret, display_name");

  if (error || !stores || stores.length === 0) {
    return NextResponse.json(
      { error: "Ingen butikker registrert ennå.", products: [] },
      { status: 200 }
    );
  }

  const { data: hidden } = await supabase
    .from("hidden_products")
    .select("store_domain, product_id");

  const hiddenSet = new Set(
    (hidden || []).map((h) => `${h.store_domain}-${h.product_id}`)
  );

  const results = await Promise.all(
    (stores as Store[]).map((store) => fetchProductsForStore(store))
  );

  const products = results
    .flat()
    .filter((p) => !hiddenSet.has(`${p.storeDomain}-${p.shopifyProductId}`));

  return NextResponse.json({ products });
}
