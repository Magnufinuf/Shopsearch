"use client";

import { useEffect, useState } from "react";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
      <h2 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 14 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  fontSize: 14,
  boxSizing: "border-box",
};

export default function InnstillingerPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [domain, setDomain] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("shopsearch_theme");
    setDarkMode(savedTheme === "dark");

    const savedDomain = localStorage.getItem("shopsearch_business_domain");
    if (savedDomain) setDomain(savedDomain);
  }, []);

  useEffect(() => {
    if (!domain) return;
    setLoading(true);
    fetch("/api/store-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: domain }),
    })
      .then((res) => res.json())
      .then((data) => {
        setDisplayName(data.displayName || "");
        setContactEmail(data.contactEmail || "");
        setLoading(false);
      });
  }, [domain]);

  function toggleDarkMode() {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem("shopsearch_theme", newValue ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newValue);
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/update-store-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: domain, displayName, contactEmail }),
    });
    setSaving(false);
    setMessage(res.ok ? "Lagret!" : "Noe gikk galt, prøv igjen.");
  }

  return (
    <main style={{ padding: "48px 24px", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 28, fontWeight: 600, marginBottom: 24 }}>
        Innstillinger
      </h1>

      {domain && (
        <Panel title="Bedriftsinfo">
          {loading ? (
            <p style={{ opacity: 0.6 }}>Laster...</p>
          ) : (
            <>
              <label style={{ display: "block", fontSize: 13, opacity: 0.7, marginBottom: 6 }}>Visningsnavn</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="F.eks. Auto Collections"
                style={{ ...inputStyle, marginBottom: 16 }}
              />

              <label style={{ display: "block", fontSize: 13, opacity: 0.7, marginBottom: 6 }}>Kontakt-e-post</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="post@butikken.no"
                style={{ ...inputStyle, marginBottom: 16 }}
              />

              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: "10px 20px", borderRadius: 10, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                {saving ? "Lagrer..." : "Lagre"}
              </button>
              {message && <p style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>{message}</p>}
            </>
          )}
        </Panel>
      )}

      <Panel title="Utseende">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14 }}>Lys modus</span>
          <button
            onClick={toggleDarkMode}
            style={{ position: "relative", width: 50, height: 28, borderRadius: 999, border: "none", cursor: "pointer", padding: 0, backgroundColor: darkMode ? "var(--primary)" : "#ccc" }}
          >
            <span style={{ position: "absolute", top: 2, left: darkMode ? 24 : 2, width: 24, height: 24, borderRadius: "50%", backgroundColor: "white", transition: "left 0.15s ease" }} />
          </button>
          <span style={{ fontSize: 14 }}>Mørk modus</span>
        </div>
      </Panel>

      <p style={{ opacity: 0.5, fontSize: 13 }}>Kontoinnstillinger og språkvalg kommer senere.</p>
    </main>
  );
}
