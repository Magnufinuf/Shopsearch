import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";
import { isAdvertCategory } from "@/lib/adverts";

export async function POST(request: Request) {
  const storeDomain = await getSessionShop();
  if (!storeDomain) return notLoggedIn();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const caption = formData.get("caption") as string | null;
  const rawCategory = formData.get("category");
  const category = isAdvertCategory(rawCategory) ? rawCategory : null;

  if (!file) {
    return NextResponse.json(
      { error: "Mangler fil" },
      { status: 400 }
    );
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
  let { error: insertError } = await supabase.from("adverts").insert({ ...row, category });
  // Før kategori-kolonnen finnes (supabase/annonse-kategorier.sql): lagre uten kategori.
  if (insertError && /category/i.test(insertError.message)) {
    ({ error: insertError } = await supabase.from("adverts").insert(row));
  }

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
