import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { hashLoginCode, readSignedData, safeEqual, setSessionCookie } from "@/lib/session";

// Steg 2: riktig kode = butikken kobles til (eller logges inn) med nettadressen eller feeden.
const VERIFY_COOKIE = "feed_verify";
type Pending = { domain: string; kind: "feed" | "site"; source: string; email: string; codeHash: string };

const attempts = new Map<string, number>();

export async function POST(request: NextRequest) {
  const pending = readSignedData<Pending>(request.cookies.get(VERIFY_COOKIE)?.value);
  if (!pending) return NextResponse.json({ error: "Koden har gått ut. Start på nytt." }, { status: 400 });

  // Maks 5 feil per kode.
  const tries = (attempts.get(pending.codeHash) || 0) + 1;
  attempts.set(pending.codeHash, tries);
  if (attempts.size > 5000) attempts.clear();
  if (tries > 5) return NextResponse.json({ error: "For mange feil forsøk. Start på nytt." }, { status: 429 });

  const { code } = await request.json().catch(() => ({}));
  if (!safeEqual(hashLoginCode(pending.email, String(code || "").trim()), pending.codeHash)) {
    return NextResponse.json({ error: "Feil kode. Prøv igjen." }, { status: 400 });
  }

  const { data: existing } = await supabase.from("stores").select("client_id, display_name").eq("store_domain", pending.domain).maybeSingle();
  if (existing && !/^(feed|site):/.test(String(existing.client_id || ""))) {
    return NextResponse.json({ error: "Denne nettbutikken er allerede koblet til Scavenger på en annen måte." }, { status: 400 });
  }
  const row = {
    store_domain: pending.domain,
    client_id: `${pending.kind}:${pending.email}`,
    client_secret: pending.source,
    display_name: existing?.display_name ?? null,
  };
  // Den bekreftede e-posten blir kontakt-e-post (varsler om pris og faktura). Uten kolonnen lagres resten.
  let { error } = await supabase.from("stores").upsert({ ...row, contact_email: pending.email }, { onConflict: "store_domain" });
  if (error && /contact_email/.test(error.message)) ({ error } = await supabase.from("stores").upsert(row, { onConflict: "store_domain" }));
  if (error) return NextResponse.json({ error: "Noe gikk galt, prøv igjen." }, { status: 500 });
  revalidateTag("products", { expire: 0 });
  attempts.delete(pending.codeHash);

  const response = NextResponse.json({ success: true, next: existing?.display_name ? "/admin" : "/bedrift-navn?neste=/registrer/suksess" });
  response.cookies.delete(VERIFY_COOKIE);
  setSessionCookie(response, pending.domain);
  return response;
}
