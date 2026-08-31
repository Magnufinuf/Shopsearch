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

async function getAccessToken(domain: string, clientId: string, clientSecret: string) {
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token as string;
}

async function fetchProductsForStore(store: Store) {
  try {
    // client_secret-feltet inneholder nå selve tilgangsnøkkelen fra OAuth-installasjonen
    const token = store.client_secret;
    if (!token) return [];

    const res = await fetch(
      `https://${store.store_domain}/admin/api/2024-10/products.json?limit=50`,
      {
        headers: { "X-Shopify-Access-Token": token },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];

    const data = await res.json();
    return (data.products as ShopifyProduct[]).map((p) => ({
      id: `${store.store_domain}-${p.id}`,
      title: p.title,
      price: parseFloat(p.variants[0]?.price ?? "0"),
      currency: "USD",
      category: p.product_type,
      vendor: store.display_name || p.vendor,
      tags: p.tags ? p.tags.split(",").map((t) => t.trim()) : [],
      image: p.images[0]?.src ?? "",
      sizes: p.variants.map((v) => v.title),
      url: `https://${store.store_domain}/products/${p.handle}`,
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

  const results = await Promise.all(
    (stores as Store[]).map((store) => fetchProductsForStore(store))
  );

  const products = results.flat();

  return NextResponse.json({ products });
}
