"use client";

import { useEffect, useState } from "react";
import fallbackProducts from "@/data/products.json";

type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  category: string;
  vendor: string;
  tags: string[];
  image: string;
  sizes: string[];
  url: string;
};

function search(query: string, items: Product[]): Product[] {
  const q = query.toLowerCase();

  const priceMatch = q.match(/under\s*\$?(\d+)/);
  const maxPrice = priceMatch ? parseInt(priceMatch[1], 10) : null;

  const words = q
    .replace(/under\s*\$?\d+/, "")
    .split(/\s+/)
    .filter(Boolean);

  return items.filter((item) => {
    if (maxPrice !== null && item.price > maxPrice) return false;
    if (words.length === 0) return true;

    const haystack = [item.title, item.category, item.vendor, ...item.tags]
      .join(" ")
      .toLowerCase();

    return words.some((w) => haystack.includes(w));
  });
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[] | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>(
    fallbackProducts as Product[]
  );
  const [live, setLive] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.products && data.products.length > 0) {
          setAllProducts(data.products);
          setLive(true);
        }
      })
      .catch(() => {
        // Bruk fallback-data stille i bakgrunnen hvis noe feiler
      });
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setResults(search(query, allProducts));
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
            placeholder="F.eks. hoodie under 65"
            className="flex-1 rounded-full border border-zinc-300 px-5 py-3 text-base outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-full bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Søk
          </button>
        </form>

        {live && (
          <p className="text-xs text-zinc-400">
            Viser live produkter fra butikken
          </p>
        )}

        {results !== null && (
          <div className="mt-4 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2">
            {results.length === 0 && (
              <p className="col-span-full text-zinc-500">
                Fant ingen produkter som matcher.
              </p>
            )}
            {results.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <img
                  src={p.image}
                  alt={p.title}
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <div className="flex flex-col justify-center">
                  <span className="font-medium text-black dark:text-white">
                    {p.title}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {p.price} {p.currency}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
