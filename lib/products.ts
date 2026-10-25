// Henter produktene fra alle tilkoblede butikker, Shopify og WooCommerce (kun server).
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { detectStyles } from "@/lib/styles";
import { ShopifyError, shopifyGraphQL } from "@/lib/shopify";
import { fetchWooProducts, isShopifyDomain } from "@/lib/woocommerce";
import { ensureWebhooks } from "@/lib/shopify-webhooks";

type Store = {
  store_domain: string;
  client_id: string;
  client_secret: string;
  display_name: string | null;
};

type ProductNode = {
  legacyResourceId: string;
  title: string;
  productType: string;
  vendor: string;
  tags: string[];
  handle: string;
  description: string;
  createdAt: string;
  featuredMedia: { preview?: { image?: { url: string } | null } | null } | null;
  options: { name: string; values: string[] }[];
  variants: { nodes: ({ price: string } & { [country: `local_${string}`]: { price: { amount: string; currencyCode: string } } | null | undefined })[] };
};

type ProductsPage = {
  shop: { currencyCode: string };
  products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: ProductNode[] };
};

const PAGE_SIZE = 50;
const MAX_PAGES = 40; // inntil 2000 produkter per butikk
const CACHE_SECONDS = 600; // produktene hentes på nytt fra Shopify hvert 10. minutt

// Prisene butikken selv viser kunder i disse landene (Shopify Markets), så Scavenger
// viser samme pris som butikken i stedet for å regne om med dagens kurs.
const PRICE_COUNTRIES = ["NO", "SE", "DK", "DE", "US", "GB"];

// Bare aktive, publiserte produkter (ikke utkast eller arkiverte).
const PRODUCTS_QUERY = `
  query Products($first: Int!, $after: String) {
    shop { currencyCode }
    products(first: $first, after: $after, query: "status:active AND published_status:published") {
      pageInfo { hasNextPage endCursor }
      nodes {
        legacyResourceId
        title
        productType
        vendor
        tags
        handle
        description(truncateAt: 500)
        createdAt
        featuredMedia { preview { image { url } } }
        options { name values }
        variants(first: 1) {
          nodes {
            price
            ${PRICE_COUNTRIES.map((c) => `local_${c}: contextualPricing(context: { country: ${c} }) { price { amount currencyCode } }`).join("\n            ")}
          }
        }
      }
    }
  }
`;


// Reserve: det gamle REST-API-et, brukt bare hvis GraphQL-spørringen feiler
// (f.eks. hvis Shopify endrer et felt). Kan fjernes når GraphQL har virket en stund.
type RestProduct = {
  id: number;
  title: string;
  product_type: string;
  vendor: string;
  tags: string;
  handle: string;
  body_html: string | null;
  created_at: string;
  images: { src: string }[];
  variants: { title: string; price: string }[];
};

async function fetchViaRest(store: Store): Promise<{ nodes: ProductNode[]; currency: string }> {
  const token = store.client_secret;
  const headers = { "X-Shopify-Access-Token": token };
  const shopRes = await fetch(`https://${store.store_domain}/admin/api/2025-01/shop.json`, { headers, cache: "no-store" });
  const currency = shopRes.ok ? (await shopRes.json()).shop?.currency || "USD" : "USD";
  const nodes: ProductNode[] = [];
  let url: string | null =
    `https://${store.store_domain}/admin/api/2025-01/products.json?limit=250&status=active&published_status=published` +
    `&fields=id,title,product_type,vendor,tags,handle,body_html,images,variants,created_at`;
  for (let page = 0; url && page < 8; page++) {
    const res: Response = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) throw new ShopifyError(res.status, `Shopify ${store.store_domain} svarte ${res.status}`);
    const data = await res.json();
    for (const p of (data.products as RestProduct[]) || []) {
      nodes.push({
        legacyResourceId: String(p.id),
        title: p.title,
        productType: p.product_type,
        vendor: p.vendor,
        tags: p.tags ? p.tags.split(",").map((t) => t.trim()) : [],
        handle: p.handle,
        description: (p.body_html || "").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().slice(0, 500),
        createdAt: p.created_at,
        featuredMedia: p.images[0] ? { preview: { image: { url: p.images[0].src } } } : null,
        options: [{ name: "Variant", values: p.variants.map((v) => v.title) }],
        variants: { nodes: p.variants.slice(0, 1).map((v) => ({ price: v.price })) },
      });
    }
    url = res.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
  }
  return { nodes, currency };
}

// { NOK: 381, SEK: 399, ... } fra butikkens egne priser per land.
function localPrices(variant: ProductNode["variants"]["nodes"][number] | undefined): Record<string, number> | undefined {
  if (!variant) return undefined;
  const prices: Record<string, number> = {};
  for (const country of PRICE_COUNTRIES) {
    const money = variant[`local_${country}`];
    const amount = parseFloat(money?.price.amount ?? "");
    if (money && isFinite(amount)) prices[money.price.currencyCode] = amount;
  }
  return Object.keys(prices).length ? prices : undefined;
}

// failed = true hvis Shopify ikke svarte ordentlig, så et tomt/halvt svar ikke mellomlagres.
async function fetchProductsForStore(store: Store) {
  if (!isShopifyDomain(store.store_domain)) return fetchWooProducts(store);
  const token = store.client_secret;
  if (!token) return { products: [], failed: false };
  await ensureWebhooks(store.store_domain, token);

  const nodes: ProductNode[] = [];
  let currency = "USD";
  let failed = false;
  try {
    let after: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const data: ProductsPage = await shopifyGraphQL<ProductsPage>(store.store_domain, token, PRODUCTS_QUERY, { first: PAGE_SIZE, after });
      currency = data.shop.currencyCode || currency;
      nodes.push(...data.products.nodes);
      if (!data.products.pageInfo.hasNextPage) break;
      after = data.products.pageInfo.endCursor;
    }
  } catch (graphqlErr) {
    console.error(`GraphQL feilet for ${store.store_domain}, prøver REST:`, graphqlErr);
    try {
      const rest = await fetchViaRest(store);
      nodes.length = 0;
      nodes.push(...rest.nodes);
      currency = rest.currency;
    } catch (err) {
      console.error(`Kunne ikke hente produkter fra ${store.store_domain}:`, err);
      // Midlertidige feil (for mange kall, Shopify nede, nettverk) skal ikke mellomlagres.
      // En butikk som har koblet fra appen (401/403) skal ikke stoppe mellomlagringen for alle.
      const status = err instanceof ShopifyError ? err.status : 0;
      failed = status !== 401 && status !== 403 && status !== 404;
    }
  }

  const products = nodes.map((p) => {
    const description = p.description || "";
    return {
      id: `${store.store_domain}-${p.legacyResourceId}`,
      title: p.title,
      price: parseFloat(p.variants.nodes[0]?.price ?? "0"),
      localPrices: localPrices(p.variants.nodes[0]),
      currency,
      category: p.productType,
      vendor: store.display_name || p.vendor,
      tags: p.tags,
      image: p.featuredMedia?.preview?.image?.url ?? "",
      sizes: p.options.flatMap((o) => o.values),
      url: `https://${store.store_domain}/products/${p.handle}`,
      storeDomain: store.store_domain,
      shopifyProductId: p.legacyResourceId,
      createdAt: p.createdAt,
      styles: detectStyles([p.title, p.productType, p.vendor, p.tags.join(" "), description].join(" "), `${p.title} ${p.productType}`),
    };
  });
  return { products, failed };
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
  ["all-products-v6"],
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
