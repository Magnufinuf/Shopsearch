"use client";

import { useState } from "react";

const WIX_BLACK = "#000000";

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

// Koble til (eller logge inn med) en Wix-butikk med en API-nøkkel fra Wix.
export default function WixConnectForm() {
  const [siteLink, setSiteLink] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/wix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteLink, apiKey }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      window.location.assign(data.next || "/admin");
      return;
    }
    setLoading(false);
    setError(data.error || "Noe gikk galt, prøv igjen.");
  }

  const ready = siteLink.trim() && apiKey.trim();
  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
      <ol style={{ margin: "0 0 4px", paddingLeft: 18, listStyle: "decimal", fontSize: 13, lineHeight: 1.55, opacity: 0.8 }}>
        <li>
          Logg inn på Wix og gå til{" "}
          <a href="https://manage.wix.com/account/api-keys" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            API-nøkler
          </a>{" "}
          (profilbildet ditt → <strong>Kontoinnstillinger → API-nøkler</strong>).
        </li>
        <li>
          Trykk <strong>Generer API-nøkkel</strong>, skriv «Scavenger» som navn, velg nettbutikken din og huk bare av <strong>Wix Stores</strong>.
        </li>
        <li>Trykk <strong>Generer nøkkel</strong> og kopier nøkkelen hit.</li>
        <li>Åpne kontrollpanelet til nettbutikken og kopier adressen øverst i nettleseren (den starter med manage.wix.com/dashboard/).</li>
      </ol>
      <label style={{ fontSize: 13, opacity: 0.7 }}>Lenke til kontrollpanelet</label>
      <input value={siteLink} onChange={(e) => setSiteLink(e.target.value)} placeholder="https://manage.wix.com/dashboard/..." autoComplete="off" spellCheck={false} style={input} />
      <label style={{ fontSize: 13, opacity: 0.7 }}>API-nøkkel</label>
      <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="IST...." autoComplete="off" style={input} />
      <button
        type="submit"
        disabled={!ready || loading}
        style={{ padding: "13px 20px", borderRadius: 16, backgroundColor: WIX_BLACK, color: "white", border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: !ready || loading ? 0.6 : 1 }}
      >
        {loading ? "Kobler til..." : "Fortsett med Wix"}
      </button>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
        Scavenger leser bare produktene dine. Kunder, ordrer og betaling forblir i butikken din.
      </p>
      {error && <p style={{ color: "#e05252", fontSize: 14, margin: 0 }}>{error}</p>}
    </form>
  );
}
