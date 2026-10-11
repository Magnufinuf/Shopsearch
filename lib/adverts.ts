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

// Åpner telefonens delingsmeny (Snap, SMS, Messenger …), eller kopierer lenken på PC.
export async function shareAdvert(advert: Advert) {
  const url = advertShareUrl(advert.id);
  const title = advert.caption || "Se denne på Scavenger";
  if (navigator.share) {
    await navigator.share({ title, url }).catch(() => {});
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    alert("Lenken er kopiert! Lim den inn der du vil dele den.");
  } catch {
    prompt("Kopier lenken:", url);
  }
}
