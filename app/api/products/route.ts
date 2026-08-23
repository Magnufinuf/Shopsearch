import { NextResponse } from "next/server";

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

export async function GET() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;

  if (!domain || !token) {
    return NextResponse.json(
      { error: "Shopify er ikke koblet til ennå. Mangler miljøvariabler." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://${domain}/admin/api/2024-10/products.json?limit=50`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
        },
        // Ikke cache - vi vil ha ferske data hver gang
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Shopify svarte med feil: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const products = (data.products as ShopifyProduct[]).map((p) => ({
      id: String(p.id),
      title: p.title,
      price: parseFloat(p.variants[0]?.price ?? "0"),
      currency: "USD",
      category: p.product_type,
      vendor: p.vendor,
      tags: p.tags ? p.tags.split(",").map((t) => t.trim()) : [],
      image: p.images[0]?.src ?? "",
      sizes: p.variants.map((v) => v.title),
      url: `https://${domain.replace(".myshopify.com", "")}.myshopify.com/products/${p.handle}`,
    }));

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json(
      { error: "Klarte ikke å hente produkter fra Shopify." },
      { status: 500 }
    );
  }
}
