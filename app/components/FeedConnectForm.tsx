"use client";

import { useState } from "react";
import type { Platform } from "@/lib/platforms";

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

const button: React.CSSProperties = {
  padding: "13px 20px",
  borderRadius: 16,
  backgroundColor: "var(--primary)",
  color: "white",
  border: "none",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};

// Koble til (eller logge inn) med nettadresse: Scavenger finner produktene selv. Produktfeed er valgfritt.
// Eierskap bekreftes med en kode til en e-post på butikkens domene.
export default function FeedConnectForm({ platform }: { platform?: Platform }) {
  const [siteUrl, setSiteUrl] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [showFeed, setShowFeed] = useState(false);
  const [found, setFound] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function post(path: string, body: object) {
    setLoading(true);
    setError("");
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) setError(data.error || "Noe gikk galt, prøv igjen.");
    return res.ok ? data : null;
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    const data = await post("/api/auth/feed", { siteUrl, feedUrl: showFeed ? feedUrl : "", email });
    if (data) {
      setFound(typeof data.found === "number" ? data.found : null);
      setSentTo(email);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const data = await post("/api/auth/feed/verify", { code });
    if (data) window.location.assign(data.next || "/admin");
  }

  if (sentTo) {
    return (
      <form onSubmit={verify} style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
        {found !== null && (
          <p style={{ margin: 0, fontSize: 14, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)" }}>
            {found > 0
              ? `🎉 Vi fant ${found} produkter i nettbutikken.`
              : "Vi fant ingen produkter automatisk. Etter at dere har koblet til, kan dere legge dem inn selv under Administrasjon → Produkter."}
          </p>
        )}
        <p style={{ margin: 0, fontSize: 14 }}>
          Vi har sendt en kode til <strong>{sentTo}</strong>. Skriv den inn her:
        </p>
        <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" style={input} />
        <button type="submit" disabled={code.trim().length < 6 || loading} style={{ ...button, opacity: code.trim().length < 6 || loading ? 0.6 : 1 }}>
          {loading ? "Kobler til..." : "Koble til"}
        </button>
        <button type="button" onClick={() => setSentTo(null)} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 13, cursor: "pointer" }}>
          Endre nettadresse eller e-post
        </button>
        {error && <p style={{ color: "#e05252", fontSize: 14, margin: 0 }}>{error}</p>}
      </form>
    );
  }

  const ready = siteUrl.trim() && email.trim() && (!showFeed || feedUrl.trim());
  return (
    <form onSubmit={start} style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
      <p style={{ margin: "0 0 4px", fontSize: 13, lineHeight: 1.55, opacity: 0.8 }}>
        Skriv inn adressen til nettbutikken{platform ? <> på <strong>{platform.name}</strong></> : ""}, så finner Scavenger produktene selv. Vi sender en
        kode til en e-post på butikkens domene for å bekrefte at butikken er deres.
      </p>
      <label style={{ fontSize: 13, opacity: 0.7 }}>Nettbutikkens adresse</label>
      <input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="dinbutikk.no" autoComplete="url" spellCheck={false} style={input} />
      <label style={{ fontSize: 13, opacity: 0.7 }}>E-post på butikkens domene</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="post@dinbutikk.no" autoComplete="email" style={input} />

      {showFeed ? (
        <>
          <label style={{ fontSize: 13, opacity: 0.7 }}>Lenke til produktfeed (valgfritt)</label>
          <input value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://dinbutikk.no/feed.xml" autoComplete="off" spellCheck={false} style={input} />
          <p style={{ margin: 0, fontSize: 12, opacity: 0.65 }}>
            Feeden heter ofte Google Shopping, Facebook/Meta-katalog eller Prisjakt.{platform?.hint ? ` ${platform.hint}` : ""}
          </p>
        </>
      ) : (
        <button type="button" onClick={() => setShowFeed(true)} style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "var(--primary)", fontSize: 13, cursor: "pointer" }}>
          Har dere en produktfeed? Legg den til (valgfritt)
        </button>
      )}

      <button type="submit" disabled={!ready || loading} style={{ ...button, opacity: !ready || loading ? 0.6 : 1 }}>
        {loading ? "Ser etter produkter... (kan ta litt tid)" : "Send kode"}
      </button>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
        Scavenger leser bare produktene. Kunder, ordrer og betaling forblir i butikken din. Finner vi ingen produkter, kan dere legge dem inn selv.
      </p>
      {error && <p style={{ color: "#e05252", fontSize: 14, margin: 0 }}>{error}</p>}
    </form>
  );
}
