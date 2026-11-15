import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";
import { uploadAdvertMedia } from "@/lib/advert-form";
import { CATEGORIES } from "@/lib/categories";

// Produkter butikken legger inn selv (supabase/egne-produkter.sql).
const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_PRODUCTS = 300;

function notReady() {
  return NextResponse.json({ error: "Denne funksjonen er ikke klar ennå. Prøv igjen senere." }, { status: 503 });
}

export async function POST(request: NextRequest) {
  const shop = await getSessionShop();
  if (!shop) return notLoggedIn();

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Ugyldig skjema." }, { status: 400 });
  const title = String(form.get("title") || "").trim().slice(0, 200);
  const price = parseFloat(String(form.get("price") || "").replace(/\s/g, "").replace(",", "."));
  const currency = String(form.get("currency") || "NOK").toUpperCase().slice(0, 3);
  const url = String(form.get("url") || "").trim();
  const category = String(form.get("category") || "");
  const image = form.get("image");

  if (title.length < 2) return NextResponse.json({ error: "Skriv inn navnet på produktet." }, { status: 400 });
  if (!isFinite(price) || price < 0 || price > 10_000_000) return NextResponse.json({ error: "Skriv inn en gyldig pris." }, { status: 400 });
  if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "Ugyldig valuta." }, { status: 400 });
  if (!/^https:\/\/[^\s]+\.[^\s]+$/i.test(url) || url.length > 1000) {
    return NextResponse.json({ error: "Lim inn lenken der kundene kan kjøpe produktet (starter med https://)." }, { status: 400 });
  }
  if (!(image instanceof File) || !image.type.startsWith("image/") || image.size > MAX_IMAGE) {
    return NextResponse.json({ error: "Last opp et bilde av produktet (maks 5 MB)." }, { status: 400 });
  }

  const { count, error: countError } = await supabase.from("manual_products").select("id", { count: "exact", head: true }).eq("store_domain", shop);
  if (countError) return notReady();
  if ((count || 0) >= MAX_PRODUCTS) return NextResponse.json({ error: `Dere kan legge inn maks ${MAX_PRODUCTS} produkter selv.` }, { status: 400 });

  const uploaded = await uploadAdvertMedia(image, `${shop}-produkt`);
  if ("error" in uploaded) return NextResponse.json({ error: "Klarte ikke å laste opp bildet. Prøv igjen." }, { status: 500 });

  const { error } = await supabase.from("manual_products").insert({
    store_domain: shop,
    title,
    price,
    currency,
    url,
    image_url: uploaded.media_url,
    category: CATEGORIES.some((c) => c.slug === category) ? category : null,
  });
  if (error) return notReady();
  revalidateTag("products", { expire: 0 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const shop = await getSessionShop();
  if (!shop) return notLoggedIn();
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Ugyldig produkt." }, { status: 400 });
  const { error } = await supabase.from("manual_products").delete().eq("id", id).eq("store_domain", shop);
  if (error) return notReady();
  revalidateTag("products", { expire: 0 });
  return NextResponse.json({ success: true });
}
