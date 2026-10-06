"use client";

import { useState } from "react";

type Message = {
  id: string;
  name: string;
  email: string;
  messages: string;
  created_at: string;
};

export default function InnboksPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/messages/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
      setUnlocked(true);
    } else {
      setError("Feil passord");
    }
  }

  if (!unlocked) {
    return (
      <main style={{ padding: "48px 24px", maxWidth: 400, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 24, fontWeight: 600, marginBottom: 20 }}>
          Innboks
        </h1>
        <form onSubmit={handleUnlock}>
          <input
            type="password"
            placeholder="Passord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontSize: 14, boxSizing: "border-box", marginBottom: 12 }}
          />
          {error && <p style={{ color: "#e05252", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: "10px 24px", borderRadius: 10, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            {loading ? "Sjekker..." : "Lås opp"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ padding: "48px 24px", maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 24, fontWeight: 600, marginBottom: 20 }}>
        Innboks ({messages.length})
      </h1>

      {messages.length === 0 && <p style={{ opacity: 0.6 }}>Ingen meldinger ennå.</p>}

      {messages.map((m) => (
        <div key={m.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
            <strong style={{ fontSize: 14 }}>{m.name || "Ukjent"} — {m.email}</strong>
            <span style={{ fontSize: 12, opacity: 0.5 }}>{new Date(m.created_at).toLocaleString("no-NO")}</span>
          </div>
          <p style={{ fontSize: 14, opacity: 0.85, whiteSpace: "pre-wrap" }}>{m.messages}</p>
        </div>
      ))}
    </main>
  );
}
