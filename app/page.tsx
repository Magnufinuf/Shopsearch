"use client";
import { useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { STYLES } from "@/lib/styles";
import { buildVocabulary, matchesSmartQuery, parseSmartQuery } from "@/lib/smart-search";
import { AiFilters, fetchAiFilters, matchesAiFilters } from "@/lib/ai-search";
import { CurrencyInfo, convertPrice, fetchCurrencyInfo, priceLabel } from "@/lib/currency";

type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  category: string;
  vendor: string;
  tags: string[];
  image: string;
  url: string;
  sizes?: string[];
  styles?: string[];
};

function withTracking(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}ref=shopsearch&utm_source=shopsearch&utm_medium=referral`;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await runSearch(query);
  }

  // Stil-knappene: fyll inn stilen i søkefeltet og søk.
  function searchStyle(label: string) {
    setQuery(label);
    runSearch(label);
  }

  async function runSearch(query: string) {
    setLoading(true);
    setSearched(true);
    setAiSummary(null);
    // Henter produkter og AI-tolkning samtidig.
    const [data, ai]: [{ products?: Product[] }, AiFilters | null] = await Promise.all([
      fetch("/api/products").then((res) => res.json()),
      fetchAiFilters(query),
    ]);
    const all: Product[] = data.products || [];
    const info = currencyInfo ?? (await fetchCurrencyInfo(all.map((p) => p.currency)));
    setCurrencyInfo(info);

    // AI-søk først. Gir det ingen treff, prøv uten farge/størrelse, og til slutt vanlig søk.
    if (ai) {
      const priceOf = (p: Product) => convertPrice(p.price, p.currency, info);
      let hits = all.filter((p) => matchesAiFilters(p, ai, priceOf(p)));
      if (hits.length === 0) hits = all.filter((p) => matchesAiFilters(p, ai, priceOf(p), false));
      if (hits.length > 0) {
        setAiSummary(`✨ ${ai.summary}`);
        setResults(hits);
        setLoading(false);
        return;
      }
    }

    // Smart søk (gratis, uten AI): forstår «noe varmt», synonymer, skrivefeil, farger, pris og stil.
    // Gir det null treff, prøves det uten farge, størrelse og vage ønsker.
    const smart = parseSmartQuery(query, buildVocabulary(all));
    const priceOf = (p: Product) => convertPrice(p.price, p.currency, info);
    let hits = all.filter((p) => matchesSmartQuery(p, smart, priceOf(p)));
    let summary = smart.summary;
    if (hits.length === 0) {
      hits = all.filter((p) => matchesSmartQuery(p, smart, priceOf(p), false));
      summary = "Ingen helt like treff – her er det nærmeste vi fant";
    }

    setAiSummary(hits.length > 0 && summary ? `🔎 ${summary}` : null);
    setResults(hits);
    setLoading(false);
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center px-6 py-16"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <img
          src="/logo.png"
          alt="Scavenger"
          style={{ width: 72, height: 72, objectFit: "contain" }}
        />
        <h1 className="text-4xl font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
          Don&apos;t search. Ask.
        </h1>
        <p className="max-w-md text-lg" style={{ color: "var(--foreground)", opacity: 0.7 }}>
          Fortell oss hva du leter etter, så finner vi de beste alternativene.
        </p>
        <form onSubmit={handleSearch} className="flex w-full max-w-lg gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="F.eks. noe varmt til vinteren under 1000 kr"
            className="flex-1 rounded-full border px-5 py-3 text-base outline-none"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
          />
          <button
            type="submit"
            className="rounded-full px-6 py-3 font-medium text-white transition-colors"
            style={{ backgroundColor: "var(--primary)" }}
          >
            Søk
          </button>
        </form>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/kategori/${c.slug}`}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                fontSize: 13,
                textDecoration: "none",
                color: "var(--foreground)",
              }}
            >
              {c.label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: -16 }}>
          <span style={{ fontSize: 12, opacity: 0.55, textTransform: "uppercase", letterSpacing: 1 }}>Stiler</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {STYLES.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => searchStyle(s.label)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "1px solid var(--primary)",
                  backgroundColor: "transparent",
                  color: "var(--primary)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p style={{ opacity: 0.6 }}>Søker...</p>}

        {!loading && aiSummary && (
          <p style={{ fontSize: 14, opacity: 0.75, margin: 0 }}>{aiSummary}</p>
        )}

        {!loading && searched && results.length === 0 && (
          <p style={{ opacity: 0.6 }}>Fant ingen produkter.</p>
        )}

        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
          {results.map(function (p) {
            const linkProps = {
              href: withTracking(p.url),
              target: "_blank",
              rel: "noopener noreferrer",
            };
            const price = priceLabel(p.price, p.currency, currencyInfo);
            return (
              <a key={p.id} {...linkProps} className="flex flex-col items-center gap-2 rounded-lg border p-3 text-left" style={{ borderColor: "var(--border)" }}>
                {p.image ? <img src={p.image} alt={p.title} className="h-32 w-full rounded object-cover" /> : null}
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{p.title}</p>
                <p className="text-sm" style={{ opacity: 0.6 }}>{price}</p>
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
