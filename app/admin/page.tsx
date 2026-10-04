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
  const [showAll, setShowAll] = useState(false);
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
