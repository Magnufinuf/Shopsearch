"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Product = {
  id: string;
  title: string;
  image: string;
  storeDomain: string;
  shopifyProductId: string;
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ backgroundColor: "var(--card-bg, rgba(255,255,255,0.03))", borderRadius: 12, padding: "16px 18px" }}>
      <p style={{ margin: "0 0 4px", fontSize: 13, opacity: 0.6 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function Panel({ title, titleColor, children }: { title: string; titleColor?: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px" }}>
      <h2 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 14, color: titleColor }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function AdminContent() {
  const [domain, setDomain] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const saved = localStorage.getItem("shopsearch_business_domain");
    if (saved) setDomain(saved);
  }, []);

  useEffect(() => {
    if (domain) {
      loadProducts();
      checkSubscription();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId && domain) {
      fetch("/api/confirm-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).then(() => checkSubscription());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  async function checkSubscription() {
    const res = await fetch("/api/verify-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: domain }),
    });
    const data = await res.json();
    setSubscribed(!!data.subscribed);
  }

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

  async function disconnectStore() {
    const confirmed = confirm("Er du sikker på at du vil koble fra hele butikken? Alle produktene dine vil forsvinne fra Scavenger.");
    if (!confirmed) return;
    await fetch("/api/admin/disconnect-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: domain }),
    });
    localStorage.removeItem("shopsearch_business_domain");
    setProducts([]);
    setMessage("Butikken er nå koblet fra Scavenger.");
  }

  async function startCheckout() {
    setCheckoutLoading(true);
    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: domain }),
    });
    const data = await res.json();
    setCheckoutLoading(false);
    if (data.url) window.location.href = data.url;
    else alert("Noe gikk galt: " + (data.error || "ukjent feil"));
  }

  if (!domain) {
    return (
      <main style={{ padding: "48px 24px", maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 28, fontWeight: 600, marginBottom: 16 }}>
          Butikkadministrasjon
        </h1>
        <p style={{ opacity: 0.75 }}>Du må logge inn som bedrift for å se dette. Bruk lenken i sidebaren.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "48px 24px", maxWidth: 960, margin: "0 auto" }}>
      {/* Statuslinje */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 28, fontWeight: 600, margin: "0 0 4px" }}>
            Butikkadministrasjon
          </h1>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.6 }}>{domain}</p>
        </div>
        {subscribed === true && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: "rgba(74,222,128,0.15)", color: "#4ade80", fontSize: 13, padding: "6px 14px", borderRadius: 999 }}>
            ✓ Abonnement aktivt
          </span>
        )}
        {subscribed === false && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.06)", opacity: 0.75, fontSize: 13, padding: "6px 14px", borderRadius: 999 }}>
            4% provisjon (ikke abonnert)
          </span>
        )}
      </div>

      {/* Nøkkeltall */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard label="Produkter" value={String(products.length)} />
        <StatCard label="Plan" value={subscribed ? "500 kr/mnd" : "4% provisjon"} />
      </div>

      {/* To kolonner */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "start" }}>
        <Panel title="Dine produkter">
          {loading && <p style={{ opacity: 0.6 }}>Laster produkter...</p>}
          {!loading && message && <p style={{ opacity: 0.6 }}>{message}</p>}
          {!loading && products.length > 0 && (
            <div>
              {(products.length > 3 ? products.slice(0, 3) : products).map((p) => (
                <div key={p.shopifyProductId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                  {p.image && (
                    <img src={p.image} alt={p.title} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, fontSize: 14 }}>{p.title}</span>
                  <button onClick={() => hideProduct(p.shopifyProductId)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontSize: 13, cursor: "pointer" }}>
                    Skjul
                  </button>
                </div>
              ))}
              {products.length > 3 && (
                <Link
                  href="/admin/produkter"
                  style={{ marginTop: 12, display: "block", textAlign: "center", width: "100%", padding: "10px 0", borderRadius: 8, border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13, boxSizing: "border-box" }}
                >
                  {`Vis alle (${products.length})`}
                </Link>
              )}
            </div>
          )}
        </Panel>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Panel title="Annonser">
            <p style={{ opacity: 0.75, marginBottom: 14, fontSize: 14 }}>Last opp en video eller et bilde av produktene dine.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/adverts/last-opp" style={{ display: "inline-block", padding: "10px 20px", borderRadius: 10, backgroundColor: "var(--primary)", color: "white", fontWeight: 600, fontSize: 14 }}>
                Last opp annonse
              </Link>
              <Link href="/admin/annonser" style={{ display: "inline-flex", alignItems: "center", padding: "10px 20px", borderRadius: 10, border: "1px solid var(--border)", color: "var(--foreground)", fontWeight: 600, fontSize: 14 }}>
                Mine annonser
              </Link>
            </div>
          </Panel>

          {subscribed === false && (
            <Panel title="Abonnement">
              <p style={{ opacity: 0.75, marginBottom: 14, fontSize: 14, lineHeight: 1.5 }}>
                500 kr/mnd (for butikker under 15 000 kr i salg via Scavenger). Uten abonnement tar vi 4% provisjon per salg i stedet.
              </p>
              <button onClick={startCheckout} disabled={checkoutLoading} style={{ padding: "10px 20px", borderRadius: 10, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                {checkoutLoading ? "Laster..." : "Start abonnement"}
              </button>
            </Panel>
          )}

          <Panel title="Faresone" titleColor="#e05252">
            <p style={{ opacity: 0.75, marginBottom: 14, fontSize: 14 }}>Kobler fra butikken permanent.</p>
            <button onClick={disconnectStore} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e05252", backgroundColor: "transparent", color: "#e05252", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              Koble fra butikken
            </button>
          </Panel>
        </div>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Laster...</p>}>
      <AdminContent />
    </Suspense>
  );
}
