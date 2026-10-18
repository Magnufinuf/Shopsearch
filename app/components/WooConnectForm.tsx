"use client";

import { useState } from "react";

const WOO_PURPLE = "#7F54B3";

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  fontSize: 15,
  boxSizing: "border-box",
};

// Koble til (eller logge inn med) en WooCommerce-butikk med en lesenøkkel fra WooCommerce.
export default function WooConnectForm({ initialUrl = "" }: { initialUrl?: string }) {
  const [storeUrl, setStoreUrl] = useState(initialUrl);
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/woocommerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeUrl, consumerKey, consumerSecret }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      window.location.assign(data.next || "/admin");
      return;
    }
    setLoading(false);
    setError(data.error || "Noe gikk galt, prøv igjen.");
  }

  const ready = storeUrl.trim() && consumerKey.trim() && consumerSecret.trim();
  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
      <ol style={{ margin: "0 0 4px", paddingLeft: 18, listStyle: "decimal", fontSize: 13, lineHeight: 1.55, opacity: 0.8 }}>
        <li>Logg inn i WordPress og gå til <strong>WooCommerce → Innstillinger → Avansert → REST API</strong>.</li>
        <li>Trykk <strong>Legg til nøkkel</strong>, skriv «Scavenger» som beskrivelse og velg tillatelse <strong>Les</strong>.</li>
        <li>Trykk <strong>Generer API-nøkkel</strong> og kopier begge nøklene hit.</li>
      </ol>
      <label style={{ fontSize: 13, opacity: 0.7 }}>Adressen til nettbutikken</label>
      <input value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} placeholder="dinbutikk.no" autoComplete="url" style={input} />
      <label style={{ fontSize: 13, opacity: 0.7 }}>Consumer key</label>
      <input value={consumerKey} onChange={(e) => setConsumerKey(e.target.value)} placeholder="ck_..." autoComplete="off" spellCheck={false} style={input} />
      <label style={{ fontSize: 13, opacity: 0.7 }}>Consumer secret</label>
      <input type="password" value={consumerSecret} onChange={(e) => setConsumerSecret(e.target.value)} placeholder="cs_..." autoComplete="off" style={input} />
      <button
        type="submit"
        disabled={!ready || loading}
        style={{ padding: "13px 20px", borderRadius: 16, backgroundColor: WOO_PURPLE, color: "white", border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: !ready || loading ? 0.6 : 1 }}
      >
        {loading ? "Kobler til..." : "Fortsett med WooCommerce"}
      </button>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
        Scavenger får bare lese produktene dine. Kunder, ordrer og betaling forblir i butikken din.
      </p>
      {error && <p style={{ color: "#e05252", fontSize: 14, margin: 0 }}>{error}</p>}
    </form>
  );
}
