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

// Koble til (eller logge inn) med produktfeed: lenke + e-post på butikkens domene, så en kode på e-post.
export default function FeedConnectForm({ platform }: { platform?: Platform }) {
  const [feedUrl, setFeedUrl] = useState("");
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
    const data = await post("/api/auth/feed", { feedUrl, email });
    if (data) setSentTo(email);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const data = await post("/api/auth/feed/verify", { code });
    if (data) window.location.assign(data.next || "/admin");
  }

  if (sentTo) {
    return (
      <form onSubmit={verify} style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
        <p style={{ margin: 0, fontSize: 14 }}>
          Vi har sendt en kode til <strong>{sentTo}</strong>. Skriv den inn her:
        </p>
        <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" style={input} />
        <button type="submit" disabled={code.trim().length < 6 || loading} style={{ ...button, opacity: code.trim().length < 6 || loading ? 0.6 : 1 }}>
          {loading ? "Kobler til..." : "Koble til"}
        </button>
        <button type="button" onClick={() => setSentTo(null)} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 13, cursor: "pointer" }}>
          Endre lenke eller e-post
        </button>
        {error && <p style={{ color: "#e05252", fontSize: 14, margin: 0 }}>{error}</p>}
      </form>
    );
  }

  const ready = feedUrl.trim() && email.trim();
  return (
    <form onSubmit={start} style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
      <ol style={{ margin: "0 0 4px", paddingLeft: 18, listStyle: "decimal", fontSize: 13, lineHeight: 1.55, opacity: 0.8 }}>
        <li>
          Finn produktfeeden {platform ? <>i <strong>{platform.name}</strong></> : "i nettbutikken"}. Den heter ofte <strong>Google Shopping</strong>,{" "}
          <strong>Facebook/Meta-katalog</strong>, <strong>Prisjakt</strong> eller <strong>Produktfeed</strong>, og ligger gjerne under markedsføring eller integrasjoner.
        </li>
        <li>Kopier lenken til feeden. Den slutter ofte på .xml eller .csv.</li>
        <li>Lim den inn her, og skriv en e-post på butikkens domene. Vi sender en kode dit for å bekrefte at butikken er deres.</li>
      </ol>
      {platform?.hint && <p style={{ margin: "0 0 4px", fontSize: 13, opacity: 0.8 }}>💡 {platform.hint}</p>}
      <label style={{ fontSize: 13, opacity: 0.7 }}>Lenke til produktfeeden</label>
      <input value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://dinbutikk.no/feed.xml" autoComplete="off" spellCheck={false} style={input} />
      <label style={{ fontSize: 13, opacity: 0.7 }}>E-post på butikkens domene</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="post@dinbutikk.no" autoComplete="email" style={input} />
      <button type="submit" disabled={!ready || loading} style={{ ...button, opacity: !ready || loading ? 0.6 : 1 }}>
        {loading ? "Sjekker feeden..." : "Send kode"}
      </button>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
        Scavenger leser bare produktene i feeden. Kunder, ordrer og betaling forblir i butikken din.
      </p>
      {error && <p style={{ color: "#e05252", fontSize: 14, margin: 0 }}>{error}</p>}
    </form>
  );
}
