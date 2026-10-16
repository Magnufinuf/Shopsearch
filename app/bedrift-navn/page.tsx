"use client";

import { useEffect, useState } from "react";
import { fetchSession } from "@/lib/session-client";

// Bare interne stier, så lenken ikke kan sende folk til en annen nettside.
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("neste") || "/admin";
  return next.startsWith("/") && !next.startsWith("//") && next !== "/bedrift-navn" ? next : "/admin";
}

// Butikker må velge navnet som vises for kundene før de kan bruke Scavenger.
export default function BedriftNavn() {
  const [shop, setShop] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSession().then((s) => {
      if (!s.shop) {
        window.location.assign("/logg-inn-bedrift");
        return;
      }
      if (s.displayName) {
        window.location.assign(nextPath());
        return;
      }
      setShop(s.shop);
      // Foreslå navnet butikken har i Shopify.
      fetch("/api/store-name-suggestion")
        .then((res) => (res.ok ? res.json() : { name: "" }))
        .then((d) => setName((current) => current || d.name || ""))
        .catch(() => {});
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/update-store-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    if (res.ok) {
      window.location.assign(nextPath());
      return;
    }
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    setError(data.error || "Noe gikk galt, prøv igjen.");
  }

  if (!shop) return <p style={{ padding: 24, opacity: 0.6 }}>Laster...</p>;

  const valid = name.trim().length >= 2;
  return (
    <main style={{ minHeight: "var(--page-h)", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
      <form onSubmit={save} style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <img src="/logo.png" alt="" style={{ width: 48, height: 48, objectFit: "contain", margin: "0 auto 12px", display: "block" }} />
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px" }}>Hva heter butikken din?</h1>
          <p style={{ margin: 0, opacity: 0.65, fontSize: 14 }}>Navnet vises for kundene på produktene og annonsene dine.</p>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="F.eks. Auto Collections"
          style={{ width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontSize: 16, boxSizing: "border-box" }}
        />
        <button
          type="submit"
          disabled={!valid || saving}
          style={{ width: "100%", padding: "13px 20px", borderRadius: 12, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: !valid || saving ? 0.6 : 1 }}
        >
          {saving ? "Lagrer..." : "Fortsett"}
        </button>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.55, textAlign: "center" }}>Du kan endre navnet senere under Innstillinger.</p>
        {error && <p style={{ color: "#e05252", fontSize: 14, margin: 0, textAlign: "center" }}>{error}</p>}
      </form>
    </main>
  );
}
