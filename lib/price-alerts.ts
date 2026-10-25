// Finner prisfall på lagrede produkter. Rene funksjoner, så de kan testes uten database.

// Prisen må falle med minst 5 % før vi varsler (små endringer ignoreres).
export const DROP_THRESHOLD = 0.95;

export type SnapshotProduct = {
  id?: string;
  title?: string;
  price?: number;
  currency?: string;
  image?: string;
  url?: string;
  storeDomain?: string;
  vendor?: string;
  [key: string]: unknown;
};

export type CurrentProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  localPrices?: Record<string, number>;
  image: string;
  url: string;
  storeDomain?: string;
  vendor?: string;
};

export type SavedRow = { user_id: string; product_key: string; product: SnapshotProduct };

export type PriceDrop = {
  userId: string;
  productKey: string;
  snapshot: SnapshotProduct;
  oldPrice: number;
  newPrice: number;
  currency: string;
  title: string;
  image: string;
  url: string;
  store: string;
};

// Dagens pris i samme valuta som øyeblikksbildet, eller null hvis den ikke kan sammenlignes.
function priceInCurrency(current: CurrentProduct, currency: string): number | null {
  if (current.currency === currency) return current.price;
  const local = current.localPrices?.[currency];
  return typeof local === "number" && isFinite(local) ? local : null;
}

export function findDrop(row: SavedRow, current: CurrentProduct | undefined): PriceDrop | null {
  const snap = row.product;
  if (!current || !snap) return null;
  const oldPrice = snap.price;
  const currency = snap.currency;
  if (typeof oldPrice !== "number" || !isFinite(oldPrice) || oldPrice <= 0 || !currency) return null;
  const newPrice = priceInCurrency(current, currency);
  if (newPrice === null || !isFinite(newPrice) || newPrice <= 0) return null;
  if (newPrice > oldPrice * DROP_THRESHOLD) return null;
  return {
    userId: row.user_id,
    productKey: row.product_key,
    snapshot: snap,
    oldPrice,
    newPrice,
    currency,
    title: current.title || snap.title || "",
    image: current.image || snap.image || "",
    url: current.url || snap.url || "",
    store: current.vendor || snap.vendor || current.storeDomain || snap.storeDomain || "",
  };
}

// Alle prisfall, gruppert per bruker.
export function findDrops(rows: SavedRow[], currentById: Map<string, CurrentProduct>): Map<string, PriceDrop[]> {
  const byUser = new Map<string, PriceDrop[]>();
  for (const row of rows) {
    const id = row.product?.id || row.product_key;
    const drop = findDrop(row, currentById.get(id));
    if (!drop) continue;
    const list = byUser.get(drop.userId) || [];
    list.push(drop);
    byUser.set(drop.userId, list);
  }
  return byUser;
}
