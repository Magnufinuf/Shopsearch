"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Product = {
  id: string;
  title: string;
  image: string;
  storeDomain: string;
  shopifyProductId: string;
};

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
    if (saved) {
      setDomain(saved);
    }
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
      }).then(() => {
        checkSubscription();
      });
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
    localStorage.removeItem("shopsearch_business_domain");
    setProducts([]);
    setMessage("Butikken er nå koblet fra Shopsearch.");
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

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Noe gikk galt: " + (data.error || "ukjent feil"));
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h1>Butikkadministrasjon</h1>

      {!domain && (
        <p>Du må logge inn som bedrift for å se dette. Bruk lenken i sidebaren.</p>
      )}

      {domain && (
        <>
          <p>Innlogget som: {domain}</p>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
              margin: "16px 0",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Abonnement</h2>
            {subscribed === true ? (
              <p>✅ Aktivt (500kr/mnd)</p>
            ) : subscribed === false ? (
              <>
                <p>
                  500kr/mnd (for butikker under 15.000kr i salg via Shopsearch).
                  Har du ikke aktivt abonnement, tar vi automatisk 4% provisjon
                  av hvert salg som kommer via Shopsearch i stedet.
                </p>
                <button onClick={startCheckout} disabled={checkoutLoading}>
                  {checkoutLoading ? "Laster..." : "Start abonnement"}
                </button>
              </>
            ) : (
              <p>Sjekker abonnementsstatus...</p>
            )}
          </div>
        </>
      )}

      {loading && <p>Laster...</p>}
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

export default function AdminPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Laster...</p>}>
      <AdminContent />
    </Suspense>
  );
}
