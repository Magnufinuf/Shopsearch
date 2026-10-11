import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";

export async function POST(request: Request) {
  const storeDomain = await getSessionShop();
  if (!storeDomain) return notLoggedIn();
  const { productId } = await request.json();

  if (!productId) {
    return NextResponse.json({ error: "Mangler productId" }, { status: 400 });
  }

  const { error } = await supabase
    .from("hidden_products")
    .insert({ store_domain: storeDomain, product_id: productId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
