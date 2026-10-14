"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CurrencyInfo, convertPrice, fetchCurrencyInfo } from "@/lib/currency";
import ProductCard from "../../components/ProductCard";
import { buildVocabulary, matchesSmartQuery, parseSmartQuery } from "@/lib/smart-search";
import { AiFilters, fetchAiFilters, matchesAiFilters } from "@/lib/ai-search";
import {
  Product,
  CATEGORIES,
  categorizeProduct,
  detectGender,
  getCategoryBySlug,
  Gender,
} from "@/lib/categories";


type PriceRangeDef = { key: string; label: string; min?: number; max?: number };

const PRICE_RANGES: PriceRangeDef[] = [
  { key: "alle", label: "Alle priser" },
  { key: "under500", label: "Under 500 kr", max: 500 },
  { key: "500-1000", label: "500–1000 kr", min: 500, max: 1000 },
  { key: "1000-2000", label: "1000–2000 kr", min: 1000, max: 2000 },
  { key: "over2000", label: "Over 2000 kr", min: 2000 },
];

export default function KategoriPage() {
  const params = useParams();
  const slug = String(params.slug);
  const categoryDef = getCategoryBySlug(slug);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  // Alle produkter (alle kategorier), brukes når søket ikke finner noe i denne kategorien.
  const [everyProduct, setEveryProduct] = useState<Product[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  // AI-tolkningen av siste søk, så knappene (kjønn/pris) ikke spør AI-en på nytt.
  const aiCache = useRef<{ query: string; filters: AiFilters | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState<Gender | "alle">("alle");
  const [priceRange, setPriceRange] = useState("alle");
  const [results, setResults] = useState<Product[]>([]);
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        const products: Product[] = data.products || [];
        const inCategory = products.filter((p) => categorizeProduct(p) === slug);
        setAllProducts(inCategory);
        setEveryProduct(products);
        setResults(inCategory);
        setLoading(false);
        fetchCurrencyInfo(products.map((p) => p.currency)).then(setCurrencyInfo);
      });
  }, [slug]);

  async function runSearch() {
    // AI-søk hvis det er satt opp (ANTHROPIC_API_KEY), ellers samme smarte søk som på forsiden.
    // Knappene for kjønn og pris gjelder uansett.
    if (query.trim() && aiCache.current?.query !== query) {
      aiCache.current = { query, filters: await fetchAiFilters(query) };
    }
    const ai = query.trim() ? aiCache.current?.filters ?? null : null;
    const smart = parseSmartQuery(query, buildVocabulary(everyProduct));
    const rangeDef = PRICE_RANGES.find((r) => r.key === priceRange);
    const priceOf = (p: Product) => convertPrice(p.price, p.currency, currencyInfo);
    const passesButtons = (p: Product) => {
      const price = priceOf(p);
      const matchesRangeMin = !rangeDef || rangeDef.min === undefined || price >= rangeDef.min;
      const matchesRangeMax = !rangeDef || rangeDef.max === undefined || price <= rangeDef.max;
      const matchesGender = gender === "alle" || detectGender(p) === gender;
      return matchesRangeMin && matchesRangeMax && matchesGender;
    };
    const search = (list: Product[], strict: boolean) =>
      list.filter(
        (p) =>
          passesButtons(p) &&
          (ai ? matchesAiFilters(p, ai, priceOf(p), strict) : matchesSmartQuery(p, smart, priceOf(p), strict))
      );

    let hits = search(allProducts, true);
    if (hits.length === 0) hits = search(allProducts, false);
    const summary = ai ? ai.summary : smart.summary;
    let message: string | null = query.trim() && hits.length > 0 && summary ? summary : null;

    // Ingenting i denne kategorien? Søk i alle kategorier og si fra.
    if (hits.length === 0 && query.trim()) {
      hits = search(everyProduct, true);
      if (hits.length === 0) hits = search(everyProduct, false);
      if (hits.length > 0) {
        message = `Ingen treff i ${categoryDef?.label ?? "denne kategorien"} – viser treff fra alle kategorier`;
      }
    }

    setNotice(message);
    setResults(hits);
  }

  useEffect(() => {
    if (!loading) runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender, priceRange, allProducts, currencyInfo]);

  return (
    <div
      className="flex min-h-screen flex-col items-center px-6 py-16"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      <main className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
        <Link href="/" style={{ fontSize: 13, opacity: 0.6, alignSelf: "flex-start" }}>
          ← Tilbake til søk
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight">
          {categoryDef ? categoryDef.label : "Kategori"}
        </h1>

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
                color: c.slug === slug ? "white" : "var(--foreground)",
                backgroundColor: c.slug === slug ? "var(--primary)" : "transparent",
              }}
            >
              {c.label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {(["alle", "herre", "dame", "unisex"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                fontSize: 13,
                cursor: "pointer",
                color: gender === g ? "white" : "var(--foreground)",
                backgroundColor: gender === g ? "var(--primary)" : "transparent",
              }}
            >
              {g === "alle" ? "Alle" : g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {PRICE_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setPriceRange(r.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                fontSize: 13,
                cursor: "pointer",
                color: priceRange === r.key ? "white" : "var(--foreground)",
                backgroundColor: priceRange === r.key ? "var(--primary)" : "transparent",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch();
          }}
          className="flex w-full max-w-lg gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="F.eks. str. M under 1000 kr"
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

        {loading && <p style={{ opacity: 0.6 }}>Laster produkter...</p>}
        {!loading && notice && <p style={{ fontSize: 14, opacity: 0.75, margin: 0 }}>{notice}</p>}
        {!loading && results.length === 0 && (
          <p style={{ opacity: 0.6 }}>{query.trim() ? "Fant ingen produkter som passer søket." : "Fant ingen produkter i denne kategorien."}</p>
        )}

        <div className="grid w-full grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
          {results.map((p) => (
            <ProductCard key={p.id} p={p} currencyInfo={currencyInfo} source="kategori" />
          ))}
        </div>
      </main>
    </div>
  );
}
