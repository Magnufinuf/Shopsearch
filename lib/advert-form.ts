// Felles for å legge ut og redigere annonser (kun server).
import { supabase } from "./supabase";
import { STORE_CATEGORY, isAdvertCategory, isOwnProductUrl } from "./adverts";

export type AdvertFields = {
  caption: string;
  category: string;
  product_url: string | null;
  product_title: string | null;
};

// Leser skjemaet. Hele butikken: egen kategori. Ett produkt: produktet og en kategori må velges.
export function parseAdvertFields(formData: FormData, storeDomain: string): AdvertFields | { error: string } {
  const caption = String(formData.get("caption") || "").trim().slice(0, 500);
  if (formData.get("kind") !== "product") {
    return { caption, category: STORE_CATEGORY, product_url: null, product_title: null };
  }
  const productUrl = formData.get("productUrl");
  const category = formData.get("category");
  if (!isOwnProductUrl(productUrl, storeDomain)) return { error: "Velg et produkt fra butikken din." };
  if (!isAdvertCategory(category) || category === STORE_CATEGORY) return { error: "Velg en kategori." };
  const productTitle = String(formData.get("productTitle") || "").slice(0, 200);
  return { caption, category, product_url: productUrl, product_title: productTitle || null };
}

// Laster opp video/bilde og gir tilbake den offentlige lenken.
export async function uploadAdvertMedia(
  file: File,
  storeDomain: string
): Promise<{ media_url: string; media_type: "video" | "image" } | { error: string }> {
  const mediaType = file.type.startsWith("video") ? "video" : "image";
  const ext = file.name.split(".").pop();
  const fileName = `${storeDomain}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from("adverts").upload(fileName, buffer, { contentType: file.type });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from("adverts").getPublicUrl(fileName);
  return { media_url: data.publicUrl, media_type: mediaType };
}

// Før kolonnene finnes (supabase/annonse-kategorier.sql) lagres bare de gamle feltene.
export function isMissingColumnError(message: string): boolean {
  return /category|product_/i.test(message);
}

export function withoutNewColumns<T extends Partial<AdvertFields>>(row: T) {
  const { category: _category, product_url: _url, product_title: _title, ...rest } = row;
  void _category;
  void _url;
  void _title;
  return rest;
}
