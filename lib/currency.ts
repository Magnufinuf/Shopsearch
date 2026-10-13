// Felles valuta-hjelpere for forsiden og kategori-sidene.

// Landkode (ISO 3166) -> valuta. Dekker landene vi realistisk får besøk fra;
// alt annet faller tilbake til DEFAULT_CURRENCY.
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  NO: "NOK", SJ: "NOK", BV: "NOK",
  SE: "SEK",
  DK: "DKK", FO: "DKK", GL: "DKK",
  IS: "ISK",
  GB: "GBP",
  US: "USD",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  CH: "CHF", LI: "CHF",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  TR: "TRY",
  JP: "JPY",
  CN: "CNY",
  IN: "INR",
  BR: "BRL",
  MX: "MXN",
  ZA: "ZAR",
  KR: "KRW",
  SG: "SGD",
  HK: "HKD",
  IL: "ILS",
  AT: "EUR", BE: "EUR", CY: "EUR", DE: "EUR", EE: "EUR", ES: "EUR", FI: "EUR",
  FR: "EUR", GR: "EUR", HR: "EUR", IE: "EUR", IT: "EUR", LT: "EUR", LU: "EUR",
  LV: "EUR", MT: "EUR", NL: "EUR", PT: "EUR", SI: "EUR", SK: "EUR",
};

export const DEFAULT_CURRENCY = "NOK";

// Valutaer man kan velge i Innstillinger.
export const SUPPORTED_CURRENCIES = ["NOK", "SEK", "DKK", "EUR", "USD", "GBP", "CHF", "PLN", "ISK"];
export const CURRENCY_KEY = "scavenger_currency";

export function currencyForCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? null;
}

// "nb-NO" -> "NO", "en-US" -> "US", "nb" -> null
export function countryFromLocale(locale: string | null | undefined): string | null {
  if (!locale) return null;
  const match = locale.match(/[-_]([A-Za-z]{2})\b/);
  if (match) return match[1].toUpperCase();
  // Språk uten region: gjett ut fra språket
  const lang = locale.slice(0, 2).toLowerCase();
  const LANG_TO_COUNTRY: Record<string, string> = { nb: "NO", nn: "NO", no: "NO", sv: "SE", da: "DK", is: "IS" };
  return LANG_TO_COUNTRY[lang] ?? null;
}

export function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("nb-NO", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export type CurrencyInfo = {
  currency: string;
  rates: Record<string, number>; // 1 enhet av nøkkel-valutaen = rates[nøkkel] enheter av `currency`
};

// Spør vår egen /api/currency (som leser landet fra Vercel og henter kurser server-side).
export async function fetchCurrencyInfo(fromCurrencies: string[]): Promise<CurrencyInfo> {
  const from = Array.from(new Set(fromCurrencies.filter(Boolean)));
  try {
    let chosen = "";
    try {
      chosen = localStorage.getItem(CURRENCY_KEY) || "";
    } catch {}
    const res = await fetch(
      `/api/currency?from=${encodeURIComponent(from.join(","))}${chosen ? `&valuta=${encodeURIComponent(chosen)}` : ""}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as CurrencyInfo;
  } catch (err) {
    console.error("Kunne ikke hente valutakurser:", err);
    return { currency: DEFAULT_CURRENCY, rates: { [DEFAULT_CURRENCY]: 1 } };
  }
}

// Returnerer f.eks. "349,00 kr", eller original pris hvis vi mangler kurs.
export function priceLabel(price: number, productCurrency: string, info: CurrencyInfo | null): string {
  const rate = info?.rates[productCurrency];
  if (info && rate !== undefined) return formatPrice(price * rate, info.currency);
  return formatPrice(price, productCurrency);
}

// Pris i besøkerens valuta (brukes til pris-filtrene "under 500 kr" osv.).
// Mangler vi kurs, brukes originalprisen.
export function convertPrice(price: number, productCurrency: string, info: CurrencyInfo | null): number {
  const rate = info?.rates[productCurrency];
  return rate !== undefined ? price * rate : price;
}
