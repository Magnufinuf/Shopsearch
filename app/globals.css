"use client";
import { useState } from "react";

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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    const res = await fetch("/api/products");
    const data = await res.json();
    const all: Product[] = data.products || [];

    const words = query.toLowerCase().split(" ").filter(Boolean);
    const filtered = all.filter((p) => {
      const text = `${p.title} ${p.category} ${p.vendor} ${p.tags.join(" ")}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });

    setResults(filtered);
    setLoading(false);
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center px-6 py-16"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
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
            placeholder="F.eks. svarte sneakers i str. 43 under 2000 kr"
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

        {loading && <p style={{ opacity: 0.6 }}>Søker...</p>}

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
            return (
              
                key={p.id}
                {...linkProps}
                className="flex flex-col items-center gap-2 rounded-lg border p-3 text-left"
                style={{ borderColor: "var(--border)" }}
              >
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
