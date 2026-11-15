import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { supabase } from "@/lib/supabase";
import { escapeHtml, sendEmail } from "@/lib/email";
import { hashLoginCode, signData } from "@/lib/session";
import { FeedError, emailMatchesDomain, fetchFeed, isPublicHttpsUrl } from "@/lib/feed";
import { normalizeSiteUrl, readSite } from "@/lib/site-reader";

// Steg 1 for butikker på andre plattformer: de skriver inn nettadressen (og eventuelt en produktfeed).
// Vi ser hvor mange produkter vi finner, og sender en kode til en e-postadresse på butikkens eget domene
// (beviser at det er butikken selv som kobler til). Finner vi ingen, kan de legge dem inn selv etterpå.
export const maxDuration = 60;
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

  const { siteUrl: rawSite, feedUrl: rawFeed, email: rawEmail } = await request.json().catch(() => ({}));
  const site = normalizeSiteUrl(String(rawSite || ""));
  const feedUrl = String(rawFeed || "").trim();
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!site) return NextResponse.json({ error: "Skriv inn adressen til nettbutikken, f.eks. dinbutikk.no." }, { status: 400 });
  if (feedUrl && !isPublicHttpsUrl(feedUrl)) {
    return NextResponse.json({ error: "Lim inn hele lenken til feeden. Den må starte med https://" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) {
    return NextResponse.json({ error: "Skriv inn en gyldig e-postadresse." }, { status: 400 });
  }
  const domain = new URL(site).hostname.toLowerCase();

  // Hvor mange produkter finner vi? Med feed: fra feeden. Ellers: rett fra nettsiden.
  let found = 0;
  if (feedUrl) {
    try {
      const bare = (h: string) => h.replace(/^www\./, "");
      found = (await fetchFeed(feedUrl)).filter((i) => {
        try {
          return bare(new URL(i.link).hostname.toLowerCase()) === bare(domain);
        } catch {
          return false;
        }
      }).length;
    } catch (err) {
      const reason = err instanceof FeedError ? err.reason : "fetch";
      const message =
        reason === "empty"
          ? "Fant ingen produkter i feeden. Sjekk at det er produktfeeden og at produktene er synlige."
          : reason === "format"
            ? "Klarte ikke å lese feeden. Den må være en Google Shopping-feed (XML) eller en CSV-fil."
            : "Fikk ikke tak i feeden. Sjekk at lenken virker når du åpner den i nettleseren.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (found === 0) return NextResponse.json({ error: `Produktene i feeden ligger ikke på ${domain}. Sjekk nettadressen.` }, { status: 400 });
  } else {
    found = (await readSite(site).catch(() => ({ items: [] }))).items.length;
  }

  if (!emailMatchesDomain(email, domain)) {
    return NextResponse.json(
      { error: `E-posten må være på butikkens domene, for eksempel post@${domain.replace(/^www\./, "")}. Har dere ikke det, ta kontakt med oss.` },
      { status: 400 }
    );
  }

  // En butikk som allerede er koblet til på en annen måte (Shopify, WooCommerce, Wix) skal ikke overtas.
  const { data: existing } = await supabase.from("stores").select("client_id").eq("store_domain", domain).maybeSingle();
  if (existing && !/^(feed|site):/.test(String(existing.client_id || ""))) {
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

  const response = NextResponse.json({ success: true, domain, found });
  const pending = feedUrl ? { kind: "feed", source: feedUrl } : { kind: "site", source: site };
  response.cookies.set(VERIFY_COOKIE, signData({ domain, ...pending, email, codeHash: hashLoginCode(email, code) }, 15), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
  return response;
}
