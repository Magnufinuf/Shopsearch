import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { storeDomain } = await request.json();

  if (!storeDomain) {
    return NextResponse.json(
      { error: "Mangler storeDomain" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("stores")
    .delete()
    .eq("store_domain", storeDomain);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
