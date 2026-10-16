"use client";

import { useEffect, useState } from "react";
import { fetchSession } from "@/lib/session-client";

// Bare interne stier, så lenken ikke kan sende folk til en annen nettside.
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("neste") || "/admin";
  return next.startsWith("/") && !next.startsWith("//") && next !== "/bedrift-navn" ? next : "/admin";
}

// Butikker må velge navn og logo (vises for kundene) før de kan bruke Scavenger.
export default function BedriftNavn() {
  const [shop, setShop] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSupported, setLogoSupported] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSession().then((s) => {
      if (!s.shop) {
        window.location.assign("/logg-inn-bedrift");
        return;
      }
      const needsLogo = !!s.logoSupported && !s.logoUrl;
      if (s.displayName && !needsLogo) {
        window.location.assign(nextPath());
        return;
      }
      setShop(s.shop);
      setName(s.displayName || "");
      setLogoUrl(s.logoUrl || null);
      setLogoSupported(!!s.logoSupported);
      // Foreslå navnet butikken har i Shopify.
      if (!s.displayName) {
        fetch("/api/store-name-suggestion")
          .then((res) => (res.ok ? res.json() : { name: "" }))
          .then((d) => setName((current) => current || d.name || ""))
          .catch(() => {});
      }
    });
  }, []);

  function chooseFile(f: File | null) {
    setError("");
    if (f && f.size > 2 * 1024 * 1024) {
      setError("Bildet er for stort. Maks 2 MB.");
      return;
    }
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const fail = async (res: Response) => {
      const data = await res.json().catch(() => ({}));
      setSaving(false);
      setError(data.error || "Noe gikk galt, prøv igjen.");
    };

    if (file) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/store-logo", { method: "POST", body: form });
      if (!res.ok) return fail(res);
    }

    const res = await fetch("/api/update-store-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    if (!res.ok) return fail(res);
    window.location.assign(nextPath());
  }

  if (!shop) return <p style={{ padding: 24, opacity: 0.6 }}>Laster...</p>;

  const shownLogo = preview || logoUrl;
  const valid = name.trim().length >= 2 && (!logoSupported || !!shownLogo);
  return (
    <main style={{ minHeight: "var(--page-h)", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
      <form onSubmit={save} style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px" }}>Sett opp butikken din</h1>
          <p style={{ margin: 0, opacity: 0.65, fontSize: 14 }}>Navnet og logoen vises for kundene på produktene og annonsene dine.</p>
        </div>

        {logoSupported && (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 4 }}>
            <span
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                border: shownLogo ? "1px solid var(--border)" : "2px dashed var(--border)",
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {shownLogo ? (
                <img src={shownLogo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 13, opacity: 0.6, color: "#333" }}>Logo</span>
              )}
            </span>
            <span style={{ fontSize: 14, color: "var(--primary)", fontWeight: 600 }}>{shownLogo ? "Bytt logo" : "Last opp logo"}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => chooseFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
          </label>
        )}

        <label style={{ fontSize: 13, fontWeight: 600 }}>Navn på butikken</label>
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
        <p style={{ margin: 0, fontSize: 12, opacity: 0.55, textAlign: "center" }}>Du kan endre dette senere under Innstillinger.</p>
        {error && <p style={{ color: "#e05252", fontSize: 14, margin: 0, textAlign: "center" }}>{error}</p>}
      </form>
    </main>
  );
}
