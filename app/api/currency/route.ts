import { NextRequest, NextResponse } from "next/server";
import { fetchRate } from "@/lib/exchange";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES, countryFromLocale, currencyForCountry } from "@/lib/currency";

// Finner besøkerens valuta og henter kurser fra butikk-valutaene til den.
// Kjøres på serveren så vi slipper ipapi.co (rate-limit/CORS/adblock) i nettleseren.
//
// GET /api/currency?from=USD,EUR  ->  { currency: "NOK", rates: { NOK: 1, USD: 10.9, EUR: 11.7 } }

export async function GET(request: NextRequest) {
  const ipCountry = request.headers.get("x-vercel-ip-country");
  const acceptLanguage = request.headers.get("accept-language")?.split(",")[0];
  // Valgt i Innstillinger -> Valuta (?valuta=EUR), ellers gjettet fra landet.
  const chosen = request.nextUrl.searchParams.get("valuta")?.toUpperCase();
  const currency =
    (chosen && SUPPORTED_CURRENCIES.includes(chosen) ? chosen : null) ??
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
