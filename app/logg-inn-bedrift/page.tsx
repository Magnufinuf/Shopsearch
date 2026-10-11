"use client";

import { useState } from "react";
import Link from "next/link";

const inputStyle = {
  padding: "10px 14px",
  width: "100%",
  borderRadius: 10,
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  fontSize: 15,
  boxSizing: "border-box" as const,
};

export default function LoggInnBedrift() {
  const [domain, setDomain] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: domain, secret }),
    });
    const data = await res.json();

    if (res.ok) {
      // Full omlasting, så sidemenyen også oppdager innloggingen.
      window.location.href = "/admin";
      return;
    }
    setError(data.error || "Noe gikk galt, prøv igjen.");
    setLoading(false);
  }

  const shopifyLoginHref = domain.trim()
    ? `/api/auth/start?login=1&shop=${encodeURIComponent(domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))}`
    : undefined;

  return (
    <main style={{ padding: "48px 24px", maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
        Logg inn som bedrift
      </h1>
      <p style={{ opacity: 0.7, fontSize: 14, marginBottom: 24 }}>
        Bruk butikkens myshopify-domene og hemmeligheten du brukte da du koblet til butikken.
      </p>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="dinbutikk.myshopify.com"
          autoComplete="username"
          style={inputStyle}
        />
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Hemmelighet"
          autoComplete="current-password"
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={!domain || !secret || loading}
          style={{ padding: "12px 20px", borderRadius: 10, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: !domain || !secret || loading ? 0.6 : 1 }}
        >
          {loading ? "Logger inn..." : "Logg inn"}
        </button>
        {error && <p style={{ color: "#e05252", fontSize: 14, margin: 0 }}>{error}</p>}
      </form>

      <p style={{ opacity: 0.6, fontSize: 13, marginTop: 24, lineHeight: 1.5 }}>
        Installerte du Scavenger via Shopify?{" "}
        {shopifyLoginHref ? (
          <a href={shopifyLoginHref} style={{ color: "var(--primary)" }}>Logg inn med Shopify</a>
        ) : (
          <span>Skriv inn domenet over, så kan du logge inn med Shopify.</span>
        )}
        <br />
        Ikke koblet til ennå? <Link href="/registrer" style={{ color: "var(--primary)" }}>Koble til butikken</Link>
      </p>
    </main>
  );
}
