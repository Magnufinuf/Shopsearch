import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import AdvertsFeed from "./AdvertsFeed";

type Props = { searchParams: Promise<{ annonse?: string | string[] }> };

// Delte lenker (/adverts?annonse=ID) får produktbildet og teksten som forhåndsvisning
// i Snapchat, Messenger, WhatsApp, iMessage osv.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { annonse } = await searchParams;
  const id = Array.isArray(annonse) ? annonse[0] : annonse;
  if (!id || !/^\d+$/.test(id)) return { title: "Annonser – Scavenger" };

  const { data: advert } = await supabase
    .from("adverts")
    .select("caption, store_domain, media_url, media_type")
    .eq("id", id)
    .maybeSingle();
  if (!advert) return { title: "Annonser – Scavenger" };

  const store = advert.store_domain.replace(".myshopify.com", "");
  const title = advert.caption ? `${advert.caption} – ${store}` : `Se dette fra ${store}`;
  const description = "Funnet på Scavenger – trykk for å se annonsen.";
  const isVideo = advert.media_type === "video";

  return {
    title: `${title} | Scavenger`,
    description,
    openGraph: {
      title,
      description,
      type: isVideo ? "video.other" : "website",
      url: `/adverts?annonse=${id}`,
      images: isVideo ? ["/logo.png"] : [{ url: advert.media_url, alt: title }],
      ...(isVideo ? { videos: [{ url: advert.media_url }] } : {}),
    },
    twitter: {
      card: isVideo ? "summary" : "summary_large_image",
      title,
      description,
      images: isVideo ? ["/logo.png"] : [advert.media_url],
    },
  };
}

export default function AdvertsPage() {
  return <AdvertsFeed />;
}
