"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { STYLES } from "@/lib/styles";
import { buildVocabulary, matchesSmartQuery, parseSmartQuery } from "@/lib/smart-search";
import { AiFilters, fetchAiFilters, fetchImageFilters, matchesAiFilters, shrinkImage } from "@/lib/ai-search";
import { CurrencyInfo, convertPrice, fetchCurrencyInfo } from "@/lib/currency";
import { useLang, useT } from "@/lib/i18n";
import ProductCard from "./components/ProductCard";
import InstallPrompt from "./components/InstallPrompt";
import { CameraIcon, CloseIcon } from "./components/Icons";

type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  localPrices?: Record<string, number>;
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

type SortKey = "relevans" | "pris-lav" | "pris-hoy" | "nyeste";

function sortProducts(products: Product[], sort: SortKey, info: CurrencyInfo | null): Product[] {
  if (sort === "relevans") return products;
  const priceOf = (p: Product) => convertPrice(p.price, p.currency, info, p.localPrices);
  const sorted = [...products];
  if (sort === "pris-lav") sorted.sort((a, b) => priceOf(a) - priceOf(b));
  if (sort === "pris-hoy") sorted.sort((a, b) => priceOf(b) - priceOf(a));
  if (sort === "nyeste") sorted.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return sorted;
}

// Horisontal rad med produkter (sveipes på mobil).
function ProductRow({ title, products, currencyInfo, onMore }: { title: string; products: Product[]; currencyInfo: CurrencyInfo | null; onMore?: () => void }) {
  const t = useT();
  if (products.length === 0) return null;
  return (
    <section style={{ width: "100%", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{title}</h2>
        {onMore && (
          <button onClick={onMore} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 14, cursor: "pointer", padding: 0 }}>
            {t("Se alle →")}
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, scrollSnapType: "x mandatory" }}>
        {products.map((p) => (
          <div key={p.id} style={{ scrollSnapAlign: "start", display: "flex" }}>
            <ProductCard p={p} currencyInfo={currencyInfo} width={160} source="forside" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const lang = useLang();
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  // Alle produkter, hentet med en gang så forsiden kan vise «Nytt nå» osv. før man søker.
  const [catalog, setCatalog] = useState<Product[] | null>(null);
  const [sort, setSort] = useState<SortKey>("relevans");
  // Bildesøk: bildet man søkte med (vises over resultatene) og feilmelding.
  const [searchImage, setSearchImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");

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
    setSearchImage(null);
    setImageError("");
  }

  // Bildesøk: Claude ser på bildet og gjør det om til de samme filtrene som tekstsøket.
  async function runImageSearch(file: File) {
    setLoading(true);
    setSearched(true);
    setAiSummary(null);
    setImageError("");
    setResults([]);
    setQuery("");
    setSort("relevans");
    let image: string;
    try {
      image = await shrinkImage(file);
    } catch {
      setImageError(t("Kunne ikke lese bildet. Prøv et annet bilde."));
      setLoading(false);
      return;
    }
    setSearchImage(image);
    const [all, ai]: [Product[], AiFilters | null] = await Promise.all([
      catalog ?? fetch("/api/products").then((res) => res.json()).then((d) => (d.products || []) as Product[]),
      fetchImageFilters(image, lang),
    ]);
    const info = currencyInfo ?? (await fetchCurrencyInfo(all.map((p) => p.currency)));
    setCurrencyInfo(info);
    if (!ai) {
      setImageError(t("Kunne ikke lese bildet. Prøv et annet bilde."));
      setLoading(false);
      return;
    }
    // Strengt først, så uten farge/størrelse, og til slutt bare hva slags plagg det er.
    const priceOf = (p: Product) => convertPrice(p.price, p.currency, info, p.localPrices);
    let hits = all.filter((p) => matchesAiFilters(p, ai, priceOf(p)));
    if (hits.length === 0) hits = all.filter((p) => matchesAiFilters(p, ai, priceOf(p), false));
    if (hits.length === 0) {
      const loose = { ...ai, styles: [], gender: null, category: null };
      hits = all.filter((p) => matchesAiFilters(p, loose, priceOf(p), false));
    }
    setAiSummary(ai.summary || null);
    setResults(hits);
    setLoading(false);
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
    setSearchImage(null);
    setImageError("");
    setSort("relevans");
    // Henter produkter (hvis ikke allerede hentet) og AI-tolkning samtidig.
    const [all, ai]: [Product[], AiFilters | null] = await Promise.all([
      catalog ?? fetch("/api/products").then((res) => res.json()).then((d) => (d.products || []) as Product[]),
      fetchAiFilters(query, lang),
    ]);
    const info = currencyInfo ?? (await fetchCurrencyInfo(all.map((p) => p.currency)));
    setCurrencyInfo(info);

    // AI-søk først. Gir det ingen treff, prøv uten farge/størrelse, og til slutt vanlig søk.
    if (ai) {
      const priceOf = (p: Product) => convertPrice(p.price, p.currency, info, p.localPrices);
      let hits = all.filter((p) => matchesAiFilters(p, ai, priceOf(p)));
      if (hits.length === 0) hits = all.filter((p) => matchesAiFilters(p, ai, priceOf(p), false));
      if (hits.length > 0) {
        setAiSummary(ai.summary);
        setResults(hits);
        setLoading(false);
        return;
      }
    }

    // Smart søk (gratis, uten AI): forstår «noe varmt», synonymer, skrivefeil, farger, pris og stil.
    // Gir det null treff, prøves det uten farge, størrelse og vage ønsker.
    const smart = parseSmartQuery(query, buildVocabulary(all));
    const priceOf = (p: Product) => convertPrice(p.price, p.currency, info, p.localPrices);
    let hits = all.filter((p) => matchesSmartQuery(p, smart, priceOf(p)));
    // Forklaringen fra det vanlige søket finnes bare på norsk.
    let summary = lang === "no" ? smart.summary : "";
    if (hits.length === 0) {
      hits = all.filter((p) => matchesSmartQuery(p, smart, priceOf(p), false));
      summary = t("Ingen helt like treff – her er det nærmeste vi fant");
    }

    setAiSummary(hits.length > 0 && summary ? summary : null);
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
          {t("Fortell oss hva du leter etter, så finner vi de beste alternativene.")}
        </p>
        <form onSubmit={handleSearch} className="flex w-full max-w-lg gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("F.eks. noe varmt til vinteren under 1000 kr")}
            className="min-w-0 flex-1 rounded-full border px-5 py-3 text-base outline-none"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
          />
          <label
            title={t("Søk med bilde")}
            aria-label={t("Søk med bilde")}
            className="flex items-center justify-center rounded-full border"
            style={{ width: 48, flexShrink: 0, borderColor: "var(--border)", color: "var(--foreground)", cursor: "pointer" }}
          >
            <CameraIcon size={22} />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) runImageSearch(file);
              }}
              style={{ display: "none" }}
            />
          </label>
          <button
            type="submit"
            className="shrink-0 rounded-full px-5 py-3 font-medium text-white transition-colors"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {t("Søk")}
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
              {t(c.label)}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: -16 }}>
          <span style={{ fontSize: 12, opacity: 0.55, textTransform: "uppercase", letterSpacing: 1 }}>{t("Stiler")}</span>
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
                {t(s.label)}
              </button>
            ))}
          </div>
        </div>

        {searchImage && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, alignSelf: "flex-start", textAlign: "left" }}>
            <img src={searchImage} alt={t("Bildet du søkte med")} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }} />
            <div style={{ fontSize: 14 }}>
              <div style={{ fontWeight: 600 }}>{loading ? t("Leser bildet...") : t("Søk med bilde")}</div>
              <button onClick={backToFront} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, color: "var(--primary)", fontSize: 13, cursor: "pointer" }}>
                <CloseIcon size={14} /> {t("Fjern bildet")}
              </button>
            </div>
          </div>
        )}

        {imageError && <p style={{ color: "#e05252", fontSize: 14 }}>{imageError}</p>}

        {loading && !searchImage && <p style={{ opacity: 0.6 }}>{t("Søker...")}</p>}


        {!loading && searched && !imageError && results.length === 0 && (
          <p style={{ opacity: 0.6 }}>{searchImage ? t("Fant ingen lignende produkter.") : t("Fant ingen produkter.")}</p>
        )}

        {searched && !loading && (
          <button onClick={backToFront} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--primary)", fontSize: 14, cursor: "pointer", padding: 0 }}>
            {t("← Tilbake til forsiden")}
          </button>
        )}

        {searched ? (
          !loading && results.length > 0 && (
            <div style={{ width: "100%", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                    {results.length === 1 ? t("{n} produkt", { n: results.length }) : t("{n} produkter", { n: results.length })}
                  </p>
                  {aiSummary && <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.6 }}>{aiSummary}</p>}
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  aria-label={t("Sorter")}
                  style={{ flexShrink: 0, padding: "8px 10px", borderRadius: 10, border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: 13 }}
                >
                  <option value="relevans">{t("Mest relevant")}</option>
                  <option value="pris-lav">{t("Pris: lav til høy")}</option>
                  <option value="pris-hoy">{t("Pris: høy til lav")}</option>
                  <option value="nyeste">{t("Nyeste")}</option>
                </select>
              </div>
              <div className="grid w-full grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
                {sortProducts(results, sort, currencyInfo).map((p) => (
                  <ProductCard key={p.id} p={p} currencyInfo={currencyInfo} />
                ))}
              </div>
            </div>
          )
        ) : (
          <FrontSections catalog={catalog} currencyInfo={currencyInfo} onSearch={searchStyle} />
        )}
      </main>
      <InstallPrompt />
    </div>
  );
}

// Forsiden før man har søkt: rader med produkter så det er noe å se på med en gang.
function FrontSections({ catalog, currencyInfo, onSearch }: { catalog: Product[] | null; currencyInfo: CurrencyInfo | null; onSearch: (q: string) => void }) {
  const t = useT();
  if (catalog === null) return <p style={{ opacity: 0.5 }}>{t("Laster produkter...")}</p>;
  if (catalog.length === 0) return null;

  const priceOf = (p: Product) => convertPrice(p.price, p.currency, currencyInfo, p.localPrices);
  const newest = [...catalog].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 12);
  const cheap = catalog.filter((p) => priceOf(p) <= 500).slice(0, 12);
  // Stiler med minst to produkter, de største først.
  const styleRows = STYLES.map((s) => ({ style: s, products: catalog.filter((p) => (p.styles || []).includes(s.slug)) }))
    .filter((r) => r.products.length >= 2)
    .sort((a, b) => b.products.length - a.products.length)
    .slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, width: "100%", marginTop: 8 }}>
      <ProductRow title={t("Nytt nå")} products={newest} currencyInfo={currencyInfo} />
      {cheap.length >= 2 && cheap.length < catalog.length && (
        <ProductRow title={t("Under 500 kr")} products={cheap} currencyInfo={currencyInfo} onMore={() => onSearch("under 500")} />
      )}
      {styleRows.map((r) => (
        <ProductRow key={r.style.slug} title={t(r.style.label)} products={r.products.slice(0, 12)} currencyInfo={currencyInfo} onMore={() => onSearch(r.style.label)} />
      ))}
      <section style={{ width: "100%", textAlign: "left" }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 10px" }}>{t("Utforsk alt")}</h2>
        <div className="grid w-full grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
          {catalog.slice(0, 24).map((p) => (
            <ProductCard key={p.id} p={p} currencyInfo={currencyInfo} source="forside" />
          ))}
        </div>
      </section>
    </div>
  );
}
