import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CURRENCY, countryFromLocale, currencyForCountry } from "@/lib/currency";

// Finner besøkerens valuta og henter kurser fra butikk-valutaene til den.
// Kjøres på serveren så vi slipper ipapi.co (rate-limit/CORS/adblock) i nettleseren.
//
// GET /api/currency?from=USD,EUR  ->  { currency: "NOK", rates: { NOK: 1, USD: 10.9, EUR: 11.7 } }

async function fetchRate(from: string, to: string): Promise<number | null> {
  const urls = [
    `https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`,
    `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = await res.json();
      const rate = data.rates?.[to];
      if (typeof rate === "number") return rate;
    } catch {
      // prøv neste URL
    }
  }
  console.error(`Fant ingen valutakurs ${from} -> ${to}`);
  return null;
}

export async function GET(request: NextRequest) {
  const ipCountry = request.headers.get("x-vercel-ip-country");
  const acceptLanguage = request.headers.get("accept-language")?.split(",")[0];
  const currency =
    currencyForCountry(ipCountry) ??
    currencyForCountry(countryFromLocale(acceptLanguage)) ??
    DEFAULT_CURRENCY;

  const from = (request.nextUrl.searchParams.get("from") || "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{3}$/.test(c) && c !== currency);

  const rates: Record<string, number> = { [currency]: 1 };
  await Promise.all(
    Array.from(new Set(from)).map(async (c) => {
      const rate = await fetchRate(c, currency);
      if (rate !== null) rates[c] = rate;
    })
  );

  return NextResponse.json({ currency, rates });
}
