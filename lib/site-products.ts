// Produkter for butikker som er koblet til med nettadresse (kun server).
// Å lese nettsiden tar tid, så resultatet huskes i et døgn per butikk.
import { unstable_cache } from "next/cache";
import { itemsToProducts } from "./feed";
import { readSite } from "./site-reader";

export const SITE_PREFIX = "site:";

export function isSiteStore(clientId: string | null | undefined): boolean {
  return !!clientId?.startsWith(SITE_PREFIX);
}

const readSiteCached = unstable_cache(async (siteUrl: string) => (await readSite(siteUrl)).items, ["site-products-v1"], {
  revalidate: 24 * 60 * 60,
});

type SiteStore = { store_domain: string; client_id: string; client_secret: string; display_name: string | null };

export async function fetchSiteProducts(store: SiteStore) {
  try {
    return { products: itemsToProducts(await readSiteCached(store.client_secret), store), failed: false };
  } catch (err) {
    console.error(`Kunne ikke lese nettsiden til ${store.store_domain}:`, err);
    return { products: [], failed: false };
  }
}
