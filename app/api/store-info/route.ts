import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { storeDomain } = await request.json();

  if (!storeDomain) {
    return NextResponse.json({ error: "Mangler storeDomain" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("stores")
    .select("display_name, contact_email")
    .eq("store_domain", storeDomain)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    displayName: data?.display_name || "",
    contactEmail: data?.contact_email || "",
  });
}
