import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";
import { escapeHtml, sendEmail } from "@/lib/email";
import { normalizeUsername } from "@/lib/username";

const MAX_PER_DAY = 20;
const MAX_MESSAGE = 300;

// Sender en annonse til @brukernavn eller en e-postadresse. Har mottakeren konto, havner den i
// innboksen deres på Min side. Uansett får de en e-post med lenke, så venner uten konto også kan se den.
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Logg inn for å sende annonser." }, { status: 401 });

  const { advertId, to: rawTo, message: rawMessage } = await request.json();
  const to = String(rawTo || "").trim();
  const message = String(rawMessage || "").trim().slice(0, MAX_MESSAGE);

  if (!advertId) return NextResponse.json({ error: "Mangler annonse." }, { status: 400 });

  const { data: sender } = await supabase.from("users").select("email, username").eq("id", userId).maybeSingle();
  if (!sender) return NextResponse.json({ error: "Logg inn for å sende annonser." }, { status: 401 });
  if (!sender.username) {
    return NextResponse.json({ error: "Velg et brukernavn først.", needsUsername: true }, { status: 400 });
  }

  // "ola" = brukernavn, alt med @ inni = e-post.
  let email: string;
  const isEmail = to.includes("@") && !to.startsWith("@");
  if (isEmail) {
    email = to.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Skriv inn en gyldig e-postadresse." }, { status: 400 });
    }
  } else {
    const username = normalizeUsername(to);
    const { data: recipient } = username
      ? await supabase.from("users").select("email").eq("username", username).maybeSingle()
      : { data: null };
    if (!recipient) return NextResponse.json({ error: `Fant ingen med brukernavnet ${username}.` }, { status: 404 });
    email = recipient.email;
  }
  if (sender.email === email) {
    return NextResponse.json({ error: "Du kan ikke sende til deg selv. Trykk ♡ for å lagre den i stedet." }, { status: 400 });
  }

  // Begrens antall sendinger, så ingen kan bruke Scavenger til å spamme folk.
  const { count } = await supabase
    .from("shared_adverts")
    .select("id", { count: "exact", head: true })
    .eq("from_user", userId)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if ((count ?? 0) >= MAX_PER_DAY) {
    return NextResponse.json({ error: `Du kan sende maks ${MAX_PER_DAY} annonser per døgn.` }, { status: 429 });
  }

  const { data: advert } = await supabase
    .from("adverts")
    .select("id, caption, store_domain")
    .eq("id", advertId)
    .maybeSingle();
  if (!advert) return NextResponse.json({ error: "Fant ikke annonsen." }, { status: 404 });

  const { error } = await supabase.from("shared_adverts").insert({
    from_user: userId,
    to_email: email,
    advert_id: advert.id,
    message: message || null,
  });
  if (error) {
    console.error("Kunne ikke lagre sending:", error.message);
    return NextResponse.json({ error: "Noe gikk galt, prøv igjen." }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://shopsearch-gamma.vercel.app";
  const link = `${appUrl}/adverts?annonse=${advert.id}`;
  const store = advert.store_domain.replace(".myshopify.com", "");

  await sendEmail(
    email,
    `${sender.username} sendte deg noe på Scavenger`,
    `<div style="font-family:Arial,sans-serif;font-size:16px;color:#3A2A1F;line-height:1.5">
      <p><strong>${escapeHtml(sender.username)}</strong> tenkte du ville like denne fra <strong>${escapeHtml(store)}</strong>:</p>
      ${message ? `<p style="padding:12px 16px;background:#FBF3EC;border-radius:12px">«${escapeHtml(message)}»</p>` : ""}
      ${advert.caption ? `<p>${escapeHtml(advert.caption)}</p>` : ""}
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#C1502E;color:white;border-radius:12px;text-decoration:none;font-weight:bold">Se annonsen</a></p>
      <p style="font-size:13px;color:#8a7a6d">Logger du inn på Scavenger med denne e-postadressen, finner du alt du får tilsendt under Min side.</p>
    </div>`
  );

  return NextResponse.json({ success: true });
}
