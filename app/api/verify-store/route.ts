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

  const { data, error } = await supabase
    .from("stores")
    .select("store_domain, subscribed")
    .eq("store_domain", storeDomain)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({ valid: true, subscribed: !!data.subscribed });
}
