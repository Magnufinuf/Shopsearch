"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { STYLES } from "@/lib/styles";
import { buildVocabulary, matchesSmartQuery, parseSmartQuery } from "@/lib/smart-search";
import { AiFilters, fetchAiFilters, matchesAiFilters } from "@/lib/ai-search";
import { CurrencyInfo, convertPrice, fetchCurrencyInfo } from "@/lib/currency";
import ProductCard from "./components/ProductCard";

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
  createdAt?: string;
  storeDomain?: string;
  shopifyProductId?: string;
};

// Horisontal rad med produkter (sveipes på mobil).
function ProductRow({ title, products, currencyInfo, onMore }: { title: string; products: Product[]; currencyInfo: CurrencyInfo | null; onMore?: () => void }) {
  if (products.length === 0) return null;
  return (
    <section style={{ width: "100%", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{title}</h2>
        {onMore && (
          <button onClick={onMore} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 14, cursor: "pointer", padding: 0 }}>
            Se alle →
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, scrollSnapType: "x mandatory" }}>
        {products.map((p) => (
          <div key={p.id} style={{ scrollSnapAlign: "start", display: "flex" }}>
            <ProductCard p={p} currencyInfo={currencyInfo} width={170} source="forside" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  // Alle produkter, hentet med en gang så forsiden kan vise «Nytt nå» osv. før man søker.
  const [catalog, setCatalog] = useState<Product[] | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then(async (data) => {
        const all: Product[] = data.products || [];
        setCurrencyInfo(await fetchCurrencyInfo(all.map((p) => p.currency)));
        setCatalog(all);
      })
      .catch(() => setCatalog([]));
  }, []);

  function backToFront() {
    setSearched(false);
    setQuery("");
    setResults([]);
    setAiSummary(null);
  }

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
    // Henter produkter (hvis ikke allerede hentet) og AI-tolkning samtidig.
    const [all, ai]: [Product[], AiFilters | null] = await Promise.all([
      catalog ?? fetch("/api/products").then((res) => res.json()).then((d) => (d.products || []) as Product[]),
      fetchAiFilters(query),
    ]);
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

        {searched && !loading && (
          <button onClick={backToFront} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--primary)", fontSize: 14, cursor: "pointer", padding: 0 }}>
            ← Tilbake til forsiden
          </button>
        )}

        {searched ? (
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3" style={{ textAlign: "left" }}>
            {results.map((p) => (
              <ProductCard key={p.id} p={p} currencyInfo={currencyInfo} />
            ))}
          </div>
        ) : (
          <FrontSections catalog={catalog} currencyInfo={currencyInfo} onSearch={searchStyle} />
        )}
      </main>
    </div>
  );
}

// Forsiden før man har søkt: rader med produkter så det er noe å se på med en gang.
function FrontSections({ catalog, currencyInfo, onSearch }: { catalog: Product[] | null; currencyInfo: CurrencyInfo | null; onSearch: (q: string) => void }) {
  if (catalog === null) return <p style={{ opacity: 0.5 }}>Laster produkter...</p>;
  if (catalog.length === 0) return null;

  const priceOf = (p: Product) => convertPrice(p.price, p.currency, currencyInfo);
  const newest = [...catalog].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 12);
  const cheap = catalog.filter((p) => priceOf(p) <= 500).slice(0, 12);
  // Stiler med minst to produkter, de største først.
  const styleRows = STYLES.map((s) => ({ style: s, products: catalog.filter((p) => (p.styles || []).includes(s.slug)) }))
    .filter((r) => r.products.length >= 2)
    .sort((a, b) => b.products.length - a.products.length)
    .slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, width: "100%", marginTop: 8 }}>
      <ProductRow title="✨ Nytt nå" products={newest} currencyInfo={currencyInfo} />
      {cheap.length >= 2 && cheap.length < catalog.length && (
        <ProductRow title="💸 Under 500 kr" products={cheap} currencyInfo={currencyInfo} onMore={() => onSearch("under 500")} />
      )}
      {styleRows.map((r) => (
        <ProductRow key={r.style.slug} title={r.style.label} products={r.products.slice(0, 12)} currencyInfo={currencyInfo} onMore={() => onSearch(r.style.label)} />
      ))}
      <section style={{ width: "100%", textAlign: "left" }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 10px" }}>Utforsk alt</h2>
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
          {catalog.slice(0, 24).map((p) => (
            <ProductCard key={p.id} p={p} currencyInfo={currencyInfo} source="forside" />
          ))}
        </div>
      </section>
    </div>
  );
}
