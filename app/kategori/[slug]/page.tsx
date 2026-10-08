"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Product,
  CATEGORIES,
  categorizeProduct,
  detectGender,
  getCategoryBySlug,
  Gender,
} from "@/lib/categories";

function withTracking(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}ref=shopsearch&utm_source=shopsearch&utm_medium=referral`;
}

type ParsedFilters = { min?: number; max?: number; sizeOptions?: string[] };

const LETTER_SIZES = ["xxxl", "xxl", "xl", "xs", "s", "m", "l"];

const SHOE_SIZE_TABLE: string[][] = [
  ["35", "4", "2.5", "2"],
  ["36", "4.5", "3", "3.5"],
  ["37", "5", "4", "4.5"],
  ["38", "5.5", "4.5", "5"],
  ["39", "6", "5", "6"],
  ["40", "6.5", "5.5", "6.5"],
  ["41", "7.5", "6.5", "7.5"],
  ["42", "8", "7", "8"],
  ["43", "9", "8", "9"],
  ["44", "9.5", "8.5", "9.5"],
  ["45", "10.5", "9.5", "10.5"],
  ["46", "11", "10", "11"],
  ["47", "11.5", "10.5", "12"],
  ["48", "12.5", "11.5", "13"],
];

function expandShoeSize(value: string): string[] {
  const row = SHOE_SIZE_TABLE.find((r) => r.includes(value));
  return row ? row : [value];
}

function extractFilters(query: string): { cleanedQuery: string; filters: ParsedFilters } {
  let cleaned = query;
  const filters: ParsedFilters = {};

  const betweenMatch = cleaned.match(/mellom\s+(\d+)\s*(?:kr)?\s+og\s+(\d+)\s*(?:kr)?/i);
  if (betweenMatch) {
    filters.min = parseInt(betweenMatch[1], 10);
    filters.max = parseInt(betweenMatch[2], 10);
    cleaned = cleaned.replace(betweenMatch[0], " ");
  }

  const underMatch = cleaned.match(/(?:under|maks(?:imum)?|mindre enn)\s+(\d+)\s*(?:kr)?/i);
  if (underMatch) {
    filters.max = parseInt(underMatch[1], 10);
    cleaned = cleaned.replace(underMatch[0], " ");
  }

  const overMatch = cleaned.match(/(?:over|minst|mer enn)\s+(\d+)\s*(?:kr)?/i);
  if (overMatch) {
    filters.min = parseInt(overMatch[1], 10);
    cleaned = cleaned.replace(overMatch[0], " ");
  }

  cleaned = cleaned.replace(/\bkr\b/gi, " ");

  const sizeMatch = cleaned.match(/(?:str\.?|størrelse|size)\s*([a-zA-Z0-9.]+)/i);
  if (sizeMatch) {
    const raw = sizeMatch[1];
    filters.sizeOptions = /^\d+(\.\d+)?$/.test(raw) ? expandShoeSize(raw) : [raw];
    cleaned = cleaned.replace(sizeMatch[0], " ");
  } else {
    const words = cleaned.split(/\s+/);
    const found = words.find((w) => LETTER_SIZES.includes(w.toLowerCase()));
    if (found) {
      filters.sizeOptions = [found];
      cleaned = cleaned.replace(new RegExp(`\\b${found}\\b`, "i"), " ");
    }
  }

  return { cleanedQuery: cleaned.replace(/\s+/g, " ").trim(), filters };
}

export default function KategoriPage() {
  const params = useParams();
  const slug = String(params.slug);
  const categoryDef = getCategoryBySlug(slug);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState<Gender | "alle">("alle");
  const [results, setResults] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        const products: Product[] = data.products || [];
        const inCategory = products.filter((p) => categorizeProduct(p) === slug);
        setAllProducts(inCategory);
        setResults(inCategory);
        setLoading(false);
      });
  }, [slug]);

  function runSearch() {
    const { cleanedQuery, filters } = extractFilters(query);
    const words = cleanedQuery.toLowerCase().split(" ").filter(Boolean);

    const filtered = allProducts.filter((p) => {
      const text = `${p.title} ${p.category} ${p.vendor} ${p.tags.join(" ")}`.toLowerCase();
      const matchesWords = words.every((w) => text.includes(w));
      const matchesMin = filters.min === undefined || p.price >= filters.min;
      const matchesMax = filters.max === undefined || p.price <= filters.max;
      const matchesSize =
        !filters.sizeOptions ||
        (p.sizes || []).some((s) =>
          filters.sizeOptions!.some((opt) => s.toLowerCase().includes(opt.toLowerCase()))
        );
      const matchesGender = gender === "alle" || detectGender(p) === gender;
      return matchesWords && matchesMin && matchesMax && matchesSize && matchesGender;
    });

    setResults(filtered);
  }

  useEffect(() => {
    if (!loading) runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender, allProducts]);

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

        <div style={{ display: "flex", gap: 8 }}>
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
        {!loading && results.length === 0 && <p style={{ opacity: 0.6 }}>Fant ingen produkter i denne kategorien.</p>}

        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
          {results.map((p) => {
            const linkProps = {
              href: withTracking(p.url),
              target: "_blank",
              rel: "noopener noreferrer",
            };
            return (
              <a key={p.id} {...linkProps} className="flex flex-col items-center gap-2 rounded-lg border p-3 text-left" style={{ borderColor: "var(--border)" }}>
                {p.image ? <img src={p.image} alt={p.title} className="h-32 w-full rounded object-cover" /> : null}
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{p.title}</p>
                <p className="text-sm" style={{ opacity: 0.6 }}>{p.price} {p.currency}</p>
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
