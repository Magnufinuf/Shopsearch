"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/categories";
import { CurrencyInfo, convertPrice, fetchCurrencyInfo, formatPrice } from "@/lib/currency";
import { useLang, useT } from "@/lib/i18n";
import ProductCard from "../components/ProductCard";

type Outfit = { title: string; description: string; items: { role: string; product: Product }[] };

// Eksempler (norsk tekst er nøkkelen; t() oversetter dem).
const EXAMPLES = [
  "Old money-outfit til date under 1500 kr",
  "Streetwear til skolen",
  "Varmt og stilig til vinteren",
  "Sommerfest-outfit",
  "Minimalistisk hverdagsoutfit under 1000 kr",
];

export default function OutfitPage() {
  const t = useT();
  const lang = useLang();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo | null>(null);

  // Valutakurser hentes én gang (alle vanlige valutaer), så summen vises i besøkerens valuta.
  useEffect(() => {
    let active = true;
    fetchCurrencyInfo(["NOK", "SEK", "DKK", "EUR", "USD", "GBP"]).then((info) => {
      if (active) setCurrencyInfo(info);
    });
    return () => {
      active = false;
    };
  }, []);

  async function run(text: string) {
    const q = text.trim().slice(0, 300);
    if (!q || loading) return;
    setPrompt(q);
    setLoading(true);
    setError("");
    setOutfits(null);
    try {
      const res = await fetch("/api/outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q, lang }),
      });
      if (!res.ok) {
        setError(
          res.status === 503
            ? t("AI-outfit er ikke tilgjengelig akkurat nå.")
            : res.status === 429
              ? t("For mange forespørsler, vent litt og prøv igjen.")
              : t("Noe gikk galt. Prøv igjen.")
        );
        return;
      }
      const data = (await res.json()) as { outfits?: Outfit[] };
      const list = data.outfits || [];
      setOutfits(list);
      // Har vi ikke kurs for en valuta i svaret, hent på nytt med de valutaene.
      const currencies = list.flatMap((o) => o.items.map((i) => i.product.currency));
      if (currencyInfo && currencies.some((c) => currencyInfo.rates[c] === undefined)) {
        setCurrencyInfo(await fetchCurrencyInfo(currencies));
      }
    } catch {
      setError(t("Noe gikk galt. Prøv igjen."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-12 sm:px-6" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <main style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>{t("AI-outfit")}</h1>
          <p style={{ margin: 0, maxWidth: 520, fontSize: 16, opacity: 0.7 }}>
            {t("Beskriv stilen, anledningen og budsjettet, så setter vi sammen komplette outfits med plagg fra ulike butikker.")}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(prompt);
          }}
          className="flex w-full gap-2"
          style={{ maxWidth: 600, alignSelf: "center" }}
        >
          <input
            type="text"
            value={prompt}
            maxLength={300}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("F.eks. old money-outfit til date under 1500 kr")}
            aria-label={t("Beskriv outfiten du vil ha")}
            className="min-w-0 flex-1 rounded-full border px-5 py-3 text-base outline-none"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)" }}
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="shrink-0 rounded-full px-5 py-3 font-medium text-white transition-colors"
            style={{ backgroundColor: "var(--primary)", opacity: loading || !prompt.trim() ? 0.6 : 1, cursor: loading ? "default" : "pointer" }}
          >
            {t("Lag outfit")}
          </button>
        </form>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={loading}
              onClick={() => run(t(ex))}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid var(--primary)",
                backgroundColor: "transparent",
                color: "var(--primary)",
                fontSize: 13,
                cursor: loading ? "default" : "pointer",
                maxWidth: "100%",
              }}
            >
              {t(ex)}
            </button>
          ))}
        </div>

        {loading && (
          <p role="status" style={{ textAlign: "center", opacity: 0.6, margin: 0 }}>
            {t("Setter sammen outfit...")}
          </p>
        )}

        {error && !loading && <p style={{ textAlign: "center", color: "#e05252", fontSize: 14, margin: 0 }}>{error}</p>}

        {!loading && outfits && outfits.length === 0 && (
          <p style={{ textAlign: "center", opacity: 0.6, margin: 0 }}>{t("Fant ingen passende outfits. Prøv å beskrive det litt annerledes.")}</p>
        )}

        {!loading &&
          outfits?.map((o, idx) => {
            const total = o.items.reduce((sum, i) => sum + convertPrice(i.product.price, i.product.currency, currencyInfo, i.product.localPrices), 0);
            const totalCurrency = currencyInfo?.currency ?? o.items[0]?.product.currency ?? "NOK";
            const stores = new Set(o.items.map((i) => i.product.vendor)).size;
            return (
              <section
                key={idx}
                style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                    <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, margin: 0, overflowWrap: "anywhere" }}>{o.title}</h2>
                    {o.description && <p style={{ margin: "4px 0 0", fontSize: 14, opacity: 0.7 }}>{o.description}</p>}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: 12, opacity: 0.55, textTransform: "uppercase", letterSpacing: 1 }}>{t("Totalt")}</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{formatPrice(total, totalCurrency)}</div>
                    <div style={{ fontSize: 12, opacity: 0.55 }}>
                      {stores === 1 ? t("Fra 1 butikk") : t("Fra {n} butikker", { n: stores })}
                    </div>
                  </div>
                </div>
                <div className="grid w-full grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
                  {o.items.map((i) => (
                    <div key={i.product.id} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--primary)" }}>{i.role}</span>
                      <ProductCard p={i.product} currencyInfo={currencyInfo} source="outfit" />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
      </main>
    </div>
  );
}
