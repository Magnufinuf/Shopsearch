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
  const [message, setMessage] =
