import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, notLoggedIn } from "@/lib/session";
import { isMissingColumnError, parseAdvertFields, uploadAdvertMedia, withoutNewColumns } from "@/lib/advert-form";

// Butikken redigerer en av sine egne annonser: tekst, produkt/butikk, kategori og eventuelt ny video/bilde.
export async function POST(request: Request) {
  const storeDomain = await getSessionShop();
  if (!storeDomain) return notLoggedIn();

  const formData = await request.formData();
  const id = String(formData.get("id") || "");
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Mangler annonse" }, { status: 400 });

  const fields = parseAdvertFields(formData, storeDomain);
  if ("error" in fields) return NextResponse.json(fields, { status: 400 });

  const file = formData.get("file");
  let media = {};
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadAdvertMedia(file, storeDomain);
    if ("error" in uploaded) return NextResponse.json(uploaded, { status: 500 });
    media = uploaded;
  }

  const update = { ...media, ...fields };
  const run = (values: object) =>
    supabase.from("adverts").update(values).eq("id", id).eq("store_domain", storeDomain).select("id");
  let { data, error } = await run(update);
  if (error && isMissingColumnError(error.message)) {
    ({ data, error } = await run(withoutNewColumns(update)));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Fant ikke annonsen." }, { status: 404 });

  return NextResponse.json({ success: true });
}
