import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

// Butikken laster opp logoen sin (profilbildet på annonsene).
export async function POST(request: Request) {
  const shop = await getSessionShop();
  if (!shop) return notLoggedIn();

  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || !TYPES[file.type]) {
    return NextResponse.json({ error: "Velg et bilde (PNG, JPG eller WebP)." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Bildet er for stort. Maks 2 MB." }, { status: 400 });
  }

  const path = `logos/${shop}-${Date.now()}.${TYPES[file.type]}`;
  const { error: uploadError } = await supabase.storage
    .from("adverts")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const logoUrl = supabase.storage.from("adverts").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("stores").update({ logo_url: logoUrl }).eq("store_domain", shop);
  if (error) {
    const missing = /logo_url/i.test(error.message);
    return NextResponse.json({ error: missing ? "Logo er ikke slått på ennå." : error.message }, { status: 500 });
  }
  revalidateTag("products", { expire: 0 });
  return NextResponse.json({ success: true, logoUrl });
}
