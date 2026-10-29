"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/categories";
import { CurrencyInfo, fetchCurrencyInfo } from "@/lib/currency";
import { recommend } from "@/lib/for-you";
import { useT } from "@/lib/i18n";
import ProductCard from "../components/ProductCard";

// «For deg»: produkter som ligner på det du har trykket på, lagret og likt i Swipe.
export default function ForDegPage() {
  const t = useT();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then(async (data) => {
        const all: Product[] = data.products || [];
        const recs = recommend(all, 60);
        setCurrencyInfo(await fetchCurrencyInfo(recs.map((p) => p.currency)));
        setProducts(recs);
      })
      .catch(() => setProducts([]));
  }, []);

  return (
    <main style={{ padding: "40px 16px 64px", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 30, fontWeight: 600, margin: "0 0 6px" }}>{t("For deg")}</h1>
      <p style={{ margin: "0 0 24px", fontSize: 15, opacity: 0.7 }}>{t("Basert på det du har trykket på, lagret og likt i Swipe.")}</p>

      {products === null ? (
        <p style={{ opacity: 0.6 }}>{t("Laster produkter...")}</p>
      ) : products.length === 0 ? (
        <div style={{ border: "1px dashed var(--border)", borderRadius: 16, padding: 24, textAlign: "center" }}>
          <p style={{ margin: "0 0 14px", fontSize: 15, opacity: 0.8 }}>
            {t("Scavenger lærer hva du liker når du trykker på produkter, lagrer dem eller bruker Swipe.")}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/swipe" style={{ padding: "10px 18px", borderRadius: 999, backgroundColor: "var(--primary)", color: "white", fontWeight: 600, fontSize: 14 }}>
              {t("Prøv Swipe")}
            </Link>
            <Link href="/" style={{ padding: "10px 18px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--foreground)", fontWeight: 600, fontSize: 14 }}>
              {t("Søk etter produkter")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid w-full grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} currencyInfo={currencyInfo} source="fordeg" />
          ))}
        </div>
      )}
    </main>
  );
}
