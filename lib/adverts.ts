export type Advert = {
  id: string;
  store_domain: string;
  media_url: string;
  media_type: "video" | "image";
  caption: string;
  created_at: string;
};

// Lenke til butikken, merket så salget kan spores tilbake til Scavenger.
export function storeUrl(storeDomain: string): string {
  return `https://${storeDomain}/?ref=shopsearch&utm_source=shopsearch&utm_medium=referral`;
}

export function advertShareUrl(id: string): string {
  return `${window.location.origin}/adverts?annonse=${encodeURIComponent(id)}`;
}
