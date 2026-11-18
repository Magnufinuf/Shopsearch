"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSession, logout } from "@/lib/session-client";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  fontSize: 15,
  boxSizing: "border-box",
};

const linkButton: React.CSSProperties = { background: "none", border: "none", padding: 0, color: "var(--primary)", fontSize: 14, fontWeight: 600, cursor: "pointer" };

// Butikkinnstillinger: navn, logo og kontakt-e-post. Bare for innloggede butikker.
export default function Butikkinnstillinger() {
  const [domain, setDomain] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSupported, setLogoSupported] = useState(false);
  const [logoMessage, setLogoMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSession().then((s) => {
      setChecked(true);
      if (!s.shop) return;
      setDomain(s.shop);
      setLogoUrl(s.logoUrl || null);
      setLogoSupported(!!s.logoSupported);
      fetch("/api/store-info", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          setDisplayName(data.displayName || "");
          setContactEmail(data.contactEmail || "");
        });
    });
  }, []);

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setLogoMessage("Bildet er for stort. Maks 2 MB.");
      return;
    }
    setLogoMessage("Laster opp...");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/store-logo", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setLogoUrl(data.logoUrl);
      setLogoMessage("Logoen er oppdatert!");
    } else {
      setLogoMessage(data.error || "Noe gikk galt, prøv igjen.");
    }
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/update-store-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, contactEmail }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    setMessage(res.ok ? "Lagret!" : data.error || "Noe gikk galt, prøv igjen.");
  }

  if (!checked) return <p style={{ padding: 24, opacity: 0.6 }}>Laster...</p>;
  if (!domain) {
    return (
      <main style={{ padding: "48px 24px", maxWidth: 640, margin: "0 auto" }}>
        <p style={{ opacity: 0.75 }}>
          Du må <Link href="/logg-inn-bedrift" style={{ color: "var(--primary)" }}>logge inn som bedrift</Link> for å se dette.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "48px 24px", maxWidth: 640, margin: "0 auto" }}>
      <Link href="/admin" style={{ fontSize: 13, opacity: 0.6, display: "inline-block", marginBottom: 16 }}>
        ← Tilbake til administrasjon
      </Link>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 28, fontWeight: 600, margin: "0 0 4px" }}>Butikkinnstillinger</h1>
      <p style={{ fontSize: 13, opacity: 0.6, margin: "0 0 24px" }}>{domain}</p>

      <section style={{ border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
        {logoSupported && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)", backgroundColor: "white" }} />
            ) : (
              <span style={{ width: 64, height: 64, borderRadius: "50%", border: "2px dashed var(--border)" }} />
            )}
            <label style={{ ...linkButton, cursor: "pointer" }}>
              {logoUrl ? "Bytt logo" : "Last opp logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadLogo(e.target.files?.[0])} style={{ display: "none" }} />
            </label>
            {logoMessage && <span style={{ fontSize: 13, opacity: 0.7 }}>{logoMessage}</span>}
          </div>
        )}
        <label style={{ display: "block", fontSize: 13, opacity: 0.7, marginBottom: 6 }}>Butikknavn (vises for kundene)</label>
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} placeholder="F.eks. Auto Collections" style={{ ...inputStyle, marginBottom: 16 }} />
        <label style={{ display: "block", fontSize: 13, opacity: 0.7, marginBottom: 6 }}>Kontakt-e-post</label>
        <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="post@butikken.no" style={{ ...inputStyle, marginBottom: 16 }} />
        <button onClick={save} disabled={saving} style={{ padding: "11px 22px", borderRadius: 10, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Lagrer..." : "Lagre"}
        </button>
        {message && <p style={{ margin: "10px 0 0", fontSize: 13, opacity: 0.75 }}>{message}</p>}
      </section>

      <button onClick={logout} style={linkButton}>
        Logg ut som bedrift
      </button>
    </main>
  );
}
