import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { detectStyles } from "@/lib/styles";

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
  body_html: string | null;
  created_at: string;
  images: { src: string }[];
  variants: ShopifyVariant[];
};

type Store = {
  store_domain: string;
  client_id: string;
  client_secret: string;
  display_name: string | null;
};

const API = "2024-10";
const PAGE_SIZE = 250; // Shopifys maks per side
const MAX_PAGES = 8; // inntil 2000 produkter per butikk
const CACHE_SECONDS = 600; // produktene hentes på nytt fra Shopify hvert 10. minutt

async function getShopCurrency(domain: string, token: string): Promise<string> {
  try {
    const res = await fetch(`https://${domain}/admin/api/${API}/shop.json`, {
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

// Shopify deler lange lister i sider. Neste side står i Link-headeren: <url>; rel="next"
function nextPageUrl(linkHeader: string | null): string | null {
  const match = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

function stripHtml(html: string | null): string {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

async function fetchProductsForStore(store: Store) {
  const token = store.client_secret;
  if (!token) return [];

  try {
    const currency = await getShopCurrency(store.store_domain, token);
    const products: ShopifyProduct[] = [];
    // Bare aktive, publiserte produkter (ikke utkast eller arkiverte).
    let url: string | null =
      `https://${store.store_domain}/admin/api/${API}/products.json?limit=${PAGE_SIZE}&status=active&published_status=published` +
      `&fields=id,title,product_type,vendor,tags,handle,body_html,images,variants,created_at`;

    for (let page = 0; url && page < MAX_PAGES; page++) {
      const res: Response = await fetch(url, { headers: { "X-Shopify-Access-Token": token }, cache: "no-store" });
      if (!res.ok) {
        console.error(`Shopify ${store.store_domain} svarte ${res.status}`);
        break;
      }
      const data = await res.json();
      products.push(...((data.products as ShopifyProduct[]) || []));
      url = nextPageUrl(res.headers.get("link"));
    }

    return products.map((p) => {
      const tags = p.tags ? p.tags.split(",").map((t) => t.trim()) : [];
      const description = stripHtml(p.body_html).slice(0, 500);
      return {
        id: `${store.store_domain}-${p.id}`,
        title: p.title,
        price: parseFloat(p.variants[0]?.price ?? "0"),
        currency,
        category: p.product_type,
        vendor: store.display_name || p.vendor,
        tags,
        image: p.images[0]?.src ?? "",
        sizes: p.variants.map((v) => v.title),
        url: `https://${store.store_domain}/products/${p.handle}`,
        storeDomain: store.store_domain,
        shopifyProductId: String(p.id),
        createdAt: p.created_at,
        styles: detectStyles([p.title, p.product_type, p.vendor, tags.join(" "), description].join(" "), `${p.title} ${p.product_type}`),
      };
    });
  } catch (err) {
    console.error(`Kunne ikke hente produkter fra ${store.store_domain}:`, err);
    return [];
  }
}

// Alle produkter fra alle butikker, mellomlagret så søket går raskt.
// Tømmes når en butikk kobles til eller fra (revalidateTag("products")).
const getAllProducts = unstable_cache(
  async () => {
    const { data: stores } = await supabase.from("stores").select("store_domain, client_id, client_secret, display_name");
    const results = await Promise.all(((stores || []) as Store[]).map(fetchProductsForStore));
    return results.flat();
  },
  ["all-products-v4"],
  { revalidate: CACHE_SECONDS, tags: ["products"] }
);

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
