import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";
import { STORE_CATEGORY, isAdvertCategory, isOwnProductUrl } from "@/lib/adverts";

export async function POST(request: Request) {
  const storeDomain = await getSessionShop();
  if (!storeDomain) return notLoggedIn();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const caption = formData.get("caption") as string | null;
  const kind = formData.get("kind") === "product" ? "product" : "store";
  const rawCategory = formData.get("category");
  const productUrl = formData.get("productUrl");
  const productTitle = String(formData.get("productTitle") || "").slice(0, 200);

  if (!file) {
    return NextResponse.json(
      { error: "Mangler fil" },
      { status: 400 }
    );
  }

  // Hele butikken: egen kategori. Ett produkt: produktet og en kategori må velges.
  let category = STORE_CATEGORY;
  if (kind === "product") {
    if (!isOwnProductUrl(productUrl, storeDomain)) {
      return NextResponse.json({ error: "Velg et produkt fra butikken din." }, { status: 400 });
    }
    if (!isAdvertCategory(rawCategory) || rawCategory === STORE_CATEGORY) {
      return NextResponse.json({ error: "Velg en kategori." }, { status: 400 });
    }
    category = rawCategory;
  }

  const mediaType = file.type.startsWith("video") ? "video" : "image";
  const ext = file.name.split(".").pop();
  const fileName = `${storeDomain}-${Date.now()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error: uploadError } = await supabase.storage
    .from("adverts")
    .upload(fileName, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage
    .from("adverts")
    .getPublicUrl(fileName);

  const row = {
    store_domain: storeDomain,
    media_url: publicUrlData.publicUrl,
    media_type: mediaType,
    caption: caption || "",
  };
  const product = kind === "product" ? { product_url: productUrl, product_title: productTitle || null } : {};
  let { error: insertError } = await supabase.from("adverts").insert({ ...row, ...product, category });
  // Før kolonnene finnes (supabase/annonse-kategorier.sql): lagre uten kategori og produkt.
  if (insertError && /category|product_/i.test(insertError.message)) {
    ({ error: insertError } = await supabase.from("adverts").insert(row));
  }

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
