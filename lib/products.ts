// Henter produktene fra alle tilkoblede Shopify-butikker (kun server).
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

// failed = true hvis Shopify ikke svarte ordentlig, så et tomt/halvt svar ikke mellomlagres.
async function fetchProductsForStore(store: Store) {
  const token = store.client_secret;
  if (!token) return { products: [], failed: false };
  let failed = false;

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
        // Midlertidige feil (for mange kall, Shopify nede) skal ikke mellomlagres.
        // En butikk som har koblet fra appen (401/403) skal ikke stoppe mellomlagringen for alle.
        failed = res.status === 429 || res.status >= 500;
        break;
      }
      const data = await res.json();
      products.push(...((data.products as ShopifyProduct[]) || []));
      url = nextPageUrl(res.headers.get("link"));
    }

    const mapped = products.map((p) => {
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
    return { products: mapped, failed };
  } catch (err) {
    console.error(`Kunne ikke hente produkter fra ${store.store_domain}:`, err);
    return { products: [], failed: true };
  }
}

async function loadAllProducts() {
  const { data: stores, error } = await supabase.from("stores").select("store_domain, client_id, client_secret, display_name");
  const results = await Promise.all(((stores || []) as Store[]).map(fetchProductsForStore));
  return { products: results.flatMap((r) => r.products), failed: !!error || results.some((r) => r.failed) };
}

// Alle produkter fra alle butikker, mellomlagret så søket går raskt.
// Tømmes når en butikk kobles til eller fra (revalidateTag("products")).
// Feiler en butikk, kastes en feil så resultatet ikke huskes i 10 minutter.
const getCachedProducts = unstable_cache(
  async () => {
    const result = await loadAllProducts();
    if (result.failed) throw new Error("Klarte ikke å hente alle produktene fra Shopify");
    return result.products;
  },
  ["all-products-v4"],
  { revalidate: CACHE_SECONDS, tags: ["products"] }
);

export async function getAllProducts() {
  try {
    return await getCachedProducts();
  } catch {
    // Vis det vi får tak i nå, uten å mellomlagre det.
    return (await loadAllProducts()).products;
  }
}
