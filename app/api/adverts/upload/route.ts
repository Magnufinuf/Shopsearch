import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";
import { isMissingColumnError, parseAdvertFields, uploadAdvertMedia, withoutNewColumns } from "@/lib/advert-form";

export async function POST(request: Request) {
  const storeDomain = await getSessionShop();
  if (!storeDomain) return notLoggedIn();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Mangler fil" }, { status: 400 });
  }

  const fields = parseAdvertFields(formData, storeDomain);
  if ("error" in fields) return NextResponse.json(fields, { status: 400 });

  const media = await uploadAdvertMedia(file, storeDomain);
  if ("error" in media) return NextResponse.json(media, { status: 500 });

  const row = { store_domain: storeDomain, ...media, ...fields };
  let { error } = await supabase.from("adverts").insert(row);
  if (error && isMissingColumnError(error.message)) {
    ({ error } = await supabase.from("adverts").insert(withoutNewColumns(row)));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
