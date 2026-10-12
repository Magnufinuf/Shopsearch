import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("adverts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Antall kommentarer per annonse. Feiler stille (f.eks. før tabellen finnes), så feeden alltid virker.
  const counts = new Map<string, number>();
  const { data: comments } = await supabase.from("advert_comments").select("advert_id");
  for (const c of comments || []) {
    const key = String(c.advert_id);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return NextResponse.json({
    adverts: (data || []).map((a) => ({ ...a, comment_count: counts.get(String(a.id)) || 0 })),
  });
}
