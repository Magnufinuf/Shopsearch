import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { id, storeDomain } = await request.json();

  if (!id || !storeDomain) {
    return NextResponse.json({ error: "Mangler id eller storeDomain" }, { status: 400 });
  }

  const { error } = await supabase
    .from("adverts")
    .delete()
    .eq("id", id)
    .eq("store_domain", storeDomain);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
