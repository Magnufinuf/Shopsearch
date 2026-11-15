import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { supabase } from "@/lib/supabase";
import { escapeHtml, sendEmail } from "@/lib/email";
import { hashLoginCode, signData } from "@/lib/session";
import { FEED_PREFIX, FeedError, emailMatchesDomain, feedDomain, fetchFeed, isPublicHttpsUrl } from "@/lib/feed";

// Steg 1 for butikker som kobler til med produktfeed: sjekk feeden, og send en kode til en
// e-postadresse på butikkens eget domene (beviser at det er butikken selv som kobler til).
export const maxDuration = 30;
const VERIFY_COOKIE = "feed_verify";

const recent = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > 5;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "ukjent";
  if (rateLimited(ip)) return NextResponse.json({ error: "For mange forsøk. Vent noen minutter." }, { status: 429 });

  const { feedUrl: rawUrl, email: rawEmail } = await request.json().catch(() => ({}));
  const feedUrl = String(rawUrl || "").trim();
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!isPublicHttpsUrl(feedUrl)) {
    return NextResponse.json({ error: "Lim inn hele lenken til feeden. Den må starte med https://" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) {
    return NextResponse.json({ error: "Skriv inn en gyldig e-postadresse." }, { status: 400 });
  }

  let domain: string | null;
  try {
    domain = feedDomain(await fetchFeed(feedUrl));
  } catch (err) {
    const reason = err instanceof FeedError ? err.reason : "fetch";
    const message =
      reason === "empty"
        ? "Fant ingen produkter i feeden. Sjekk at det er produktfeeden og at produktene er synlige."
        : reason === "format"
          ? "Klarte ikke å lese feeden. Den må være en Google Shopping-feed (XML) eller en CSV-fil."
          : reason === "url"
            ? "Lenken ser feil ut. Kopier hele lenken til feeden."
            : "Fikk ikke tak i feeden. Sjekk at lenken virker når du åpner den i nettleseren.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (!domain) return NextResponse.json({ error: "Fant ikke nettbutikkens adresse i feeden." }, { status: 400 });

  if (!emailMatchesDomain(email, domain)) {
    return NextResponse.json(
      { error: `E-posten må være på butikkens domene, for eksempel post@${domain.replace(/^www\./, "")}. Har dere ikke det, ta kontakt med oss.` },
      { status: 400 }
    );
  }

  // En butikk som allerede er koblet til på en annen måte (Shopify, WooCommerce, Wix) skal ikke overtas.
  const { data: existing } = await supabase.from("stores").select("client_id").eq("store_domain", domain).maybeSingle();
  if (existing && !String(existing.client_id || "").startsWith(FEED_PREFIX)) {
    return NextResponse.json({ error: "Denne nettbutikken er allerede koblet til Scavenger på en annen måte. Logg inn med den." }, { status: 400 });
  }

  const code = String(randomInt(100000, 1000000));
  const sent = await sendEmail(
    email,
    `Koden din til Scavenger: ${code}`,
    `<p>Hei!</p><p>Koden for å koble <strong>${escapeHtml(domain)}</strong> til Scavenger er:</p>
     <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
     <p>Koden gjelder i 15 minutter. Har du ikke bedt om den, kan du se bort fra denne e-posten.</p>`
  );
  if (!sent) return NextResponse.json({ error: "Klarte ikke å sende e-post akkurat nå. Prøv igjen om litt." }, { status: 500 });

  const response = NextResponse.json({ success: true, domain });
  response.cookies.set(VERIFY_COOKIE, signData({ domain, feedUrl, email, codeHash: hashLoginCode(email, code) }, 15), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
  return response;
}
