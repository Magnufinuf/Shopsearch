"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  title: string;
  image: string;
  storeDomain: string;
  shopifyProductId: string;
};

export default function AlleProdukterPage() {
  const [domain, setDomain] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("shopsearch_business_domain");
    if (saved) setDomain(saved);
  }, []);

  useEffect(() => {
    if (domain) loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  async function loadProducts() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/products");
    const data = await res.json();
    const mine = (data.products || []).filter((p: Product) => p.storeDomain === domain);
    setProducts(mine);
    setLoading(false);
    if (mine.length === 0) setMessage("Fant ingen produkter for denne butikken.");
  }

  async function hideProduct(shopifyProductId: string) {
    await fetch("/api/admin/hide-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: domain, productId: shopifyProductId }),
    });
    setProducts((prev) => prev.filter((p) => p.shopifyProductId !== shopifyProductId));
  }

  if (!domain) {
    return (
      <main style={{ padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
        <p style={{ opacity: 0.75 }}>Du må logge inn som bedrift for å se dette.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
      <Link href="/admin" style={{ fontSize: 13, opacity: 0.6, display: "inline-block", marginBottom: 16 }}>
        ← Tilbake til administrasjon
      </Link>

      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 26, fontWeight: 600, marginBottom: 6 }}>
        Alle produkter
      </h1>
      <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 24 }}>{domain}</p>

      {loading && <p style={{ opacity: 0.6 }}>Laster produkter...</p>}
      {!loading && message && <p style={{ opacity: 0.6 }}>{message}</p>}

      {!loading && products.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 16, padding: "8px 24px" }}>
          {products.map((p) => (
            <div key={p.shopifyProductId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
              <a
                href={`https://${p.storeDomain}/admin/products/${p.shopifyProductId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, textDecoration: "none", color: "inherit", minWidth: 0 }}
              >
                {p.image && (
                  <img src={p.image} alt={p.title} style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 15 }}>{p.title}</span>
              </a>
              <button onClick={() => hideProduct(p.shopifyProductId)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
                Skjul
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
