import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";
import { STORE_CATEGORY, isAdvertCategory } from "@/lib/adverts";

// Butikken endrer kategorien på en av sine egne produktannonser
// (annonser for hele butikken ligger alltid under «Butikker»).
export async function POST(request: Request) {
  const storeDomain = await getSessionShop();
  if (!storeDomain) return notLoggedIn();
  const { id, category } = await request.json();
  if (!id || !isAdvertCategory(category) || category === STORE_CATEGORY) {
    return NextResponse.json({ error: "Ugyldig kategori" }, { status: 400 });
  }

  const { error } = await supabase
    .from("adverts")
    .update({ category })
    .eq("id", id)
    .eq("store_domain", storeDomain)
    .not("product_url", "is", null);

  if (error) {
    const missing = /category|product_/i.test(error.message);
    return NextResponse.json(
      { error: missing ? "Kategorier er ikke slått på ennå." : error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
