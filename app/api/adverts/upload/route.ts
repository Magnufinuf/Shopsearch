import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const storeDomain = formData.get("storeDomain") as string | null;
  const caption = formData.get("caption") as string | null;

  if (!file || !storeDomain) {
    return NextResponse.json(
      { error: "Mangler fil eller storeDomain" },
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

  const { error: insertError } = await supabase.from("adverts").insert({
    store_domain: storeDomain,
    media_url: publicUrlData.publicUrl,
    media_type: mediaType,
    caption: caption || "",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
