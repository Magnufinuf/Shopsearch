import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { supabase } from "@/lib/supabase";
import { hashLoginCode } from "@/lib/session";
import { sendEmail } from "@/lib/email";

const CODE_MINUTES = 10;

// Sender en 6-sifret innloggingskode på e-post.
export async function POST(request: Request) {
  const { email: rawEmail } = await request.json();
  const email = String(rawEmail || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Skriv inn en gyldig e-postadresse." }, { status: 400 });
  }

  // Maks én kode i minuttet per e-post, så ingen kan spamme noen med e-post.
  const { data: recent } = await supabase
    .from("login_codes")
    .select("created_at")
    .eq("email", email)
    .gte("created_at", new Date(Date.now() - 60 * 1000).toISOString())
    .limit(1);
  if (recent && recent.length > 0) {
    return NextResponse.json({ error: "Vent litt før du ber om en ny kode." }, { status: 429 });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  await supabase.from("login_codes").delete().eq("email", email);
  const { error } = await supabase.from("login_codes").insert({
    email,
    code_hash: hashLoginCode(email, code),
    expires_at: new Date(Date.now() + CODE_MINUTES * 60 * 1000).toISOString(),
  });
  if (error) {
    console.error("Kunne ikke lagre kode:", error.message);
    return NextResponse.json({ error: "Noe gikk galt, prøv igjen." }, { status: 500 });
  }

  const sent = await sendEmail(
    email,
    `${code} er koden din til Scavenger`,
    `<div style="font-family:Arial,sans-serif;font-size:16px;color:#3A2A1F">
      <p>Hei!</p>
      <p>Her er koden for å logge inn på Scavenger:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:24px 0">${code}</p>
      <p>Koden varer i ${CODE_MINUTES} minutter. Ba du ikke om den, kan du se bort fra denne e-posten.</p>
    </div>`
  );
  if (!sent) {
    return NextResponse.json({ error: "Klarte ikke å sende e-post, prøv igjen." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
