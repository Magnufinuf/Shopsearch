"use client";

import { useState } from "react";

type Product = {
  id: string;
  title: string;
  image: string;
  storeDomain: string;
  shopifyProductId: string;
};

export default function AdminPage() {
  const [domain, setDomain] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProducts() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/products");
    const data = await res.json();
    const mine = (data.products || []).filter(
      (p: Product) => p.storeDomain === domain
    );
    setProducts(mine);
    setLoading(false);
    if (mine.length === 0) {
      setMessage("Fant ingen produkter for denne butikken.");
    }
  }

  async function hideProduct(shopifyProductId: string) {
    await fetch("/api/admin/hide-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: domain, productId: shopifyProductId }),
    });
    setProducts((prev) =>
      prev.filter((p) => p.shopifyProductId !== shopifyProductId)
    );
  }

  async function disconnectStore() {
    const confirmed = confirm(
      "Er du sikker på at du vil koble fra hele butikken? Alle produktene dine vil forsvinne fra Shopsearch."
    );
    if (!confirmed) return;

    await fetch("/api/admin/disconnect-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: domain }),
    });
    setProducts([]);
    setMessage("Butikken er nå koblet fra Shopsearch.");
  }

  return (
    <main style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h1>Butikkadministrasjon</h1>
      <p>Skriv inn ditt myshopify-domene for å administrere produktene dine.</p>
      <input
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="dinbutikk.myshopify.com"
        style={{ padding: 8, width: "100%", marginBottom: 8 }}
      />
      <button onClick={loadProducts} disabled={!domain || loading}>
        {loading ? "Laster..." : "Vis mine produkter"}
      </button>

      {message && <p>{message}</p>}

      {products.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button onClick={disconnectStore} style={{ marginBottom: 16, color: "red" }}>
            Koble fra hele butikken
          </button>
          {products.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #ddd",
                padding: "8px 0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src={p.image} alt={p.title} width={40} height={40} />
                <span>{p.title}</span>
              </div>
              <button onClick={() => hideProduct(p.shopifyProductId)}>
                Skjul
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
