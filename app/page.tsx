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
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Don&apos;t search. Ask.
        </h1>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Fortell oss hva du leter etter, så finner vi de beste alternativene.
        </p>
        <form onSubmit={handleSearch} className="flex w-full max-w-lg gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="F.eks. svarte sneakers i str. 43 under 2000 kr"
            className="flex-1 rounded-full border border-zinc-300 px-5 py-3 text-base outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-full bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Søk
          </button>
        </form>

        {loading && <p className="text-zinc-500">Søker...</p>}

        {!loading && searched && results.length === 0 && (
          <p className="text-zinc-500">Fant ingen produkter.</p>
        )}

        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
          {results.map((p) => {
            return (
              
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-3 text-left hover:border-zinc-400 dark:border-zinc-800"
              >
                {p.image && (
                  <img src={p.image} alt={p.title} className="h-32 w-full rounded object-cover" />
                )}
                <p className="text-sm font-medium text-black dark:text-white">{p.title}</p>
                <p className="text-sm text-zinc-500">{p.price} {p.currency}</p>
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
