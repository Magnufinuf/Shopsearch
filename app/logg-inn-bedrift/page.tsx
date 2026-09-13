"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoggInnBedrift() {
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/verify-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: domain }),
    });
    const data = await res.json();

    if (data.valid) {
      localStorage.setItem("shopsearch_business_domain", domain);
      router.push("/admin");
    } else {
      setError("Fant ingen registrert butikk med dette domenet.");
    }
    setLoading(false);
  }

  return (
    <main style={{ padding: 24, maxWidth: 400 }}>
      <h1>Logg inn som bedrift</h1>
      <p>Skriv inn ditt myshopify-domene.</p>
      <input
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="dinbutikk.myshopify.com"
        style={{ padding: 8, width: "100%", marginBottom: 8 }}
      />
      <button onClick={handleLogin} disabled={!domain || loading}>
        {loading ? "Sjekker..." : "Logg inn"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}
