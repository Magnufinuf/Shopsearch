import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { storeDomain, productId } = await request.json();

  if (!storeDomain || !productId) {
    return NextResponse.json(
      { error: "Mangler storeDomain eller productId" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("hidden_products")
    .insert({ store_domain: storeDomain, product_id: productId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
