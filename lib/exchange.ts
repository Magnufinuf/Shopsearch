// Valutakurser (kun server). Brukes av /api/currency og når provisjon regnes om til kroner.
export async function fetchRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;
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
