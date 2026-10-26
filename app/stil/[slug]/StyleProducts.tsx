"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CurrencyInfo, fetchCurrencyInfo } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import type { Product } from "@/lib/categories";
import ProductCard from "../../components/ProductCard";

// Produktene i én stil, hentet i nettleseren (samme liste som søket bruker).
export default function StyleProducts({ slug }: { slug: string }) {
  const t = useT();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then(async (data) => {
        const all: Product[] = data.products || [];
        const inStyle = all.filter((p) => (p.styles || []).includes(slug));
        setCurrencyInfo(await fetchCurrencyInfo(inStyle.map((p) => p.currency)));
        setProducts(inStyle);
      })
      .catch(() => setProducts([]));
  }, [slug]);

  if (products === null) return <p style={{ opacity: 0.6 }}>{t("Laster produkter...")}</p>;
  if (products.length === 0) {
    return (
      <p style={{ opacity: 0.7 }}>
        {t("Ingen produkter i denne stilen ennå.")}{" "}
        <Link href="/" style={{ color: "var(--primary)" }}>
          {t("Søk i alle produkter")}
        </Link>
      </p>
    );
  }
  return (
    <div className="grid w-full grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} p={p} currencyInfo={currencyInfo} source="kategori" />
      ))}
    </div>
  );
}
