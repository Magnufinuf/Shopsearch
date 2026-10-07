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
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/messages/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError("Feil passord");
      return;
    }
    setMessages(data.messages || []);
    setAuthenticated(true);
  }

  if (!authenticated) {
    return (
      <main style={{ padding: "48px 24px", maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 26, fontWeight: 600, marginBottom: 20 }}>
          Innboks
        </h1>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passord"
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              backgroundColor: "transparent",
              color: "var(--foreground)",
              fontSize: 14,
              marginBottom: 12,
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 10,
              backgroundColor: "var(--primary)",
              color: "white",
              border: "none",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {loading ? "Sjekker..." : "Logg inn"}
          </button>
          {error && <p style={{ color: "#e05252", fontSize: 13, marginTop: 10 }}>{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main style={{ padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 26, fontWeight: 600, marginBottom: 24 }}>
        Innboks
      </h1>

      {messages.length === 0 && <p style={{ opacity: 0.6 }}>Ingen meldinger ennå.</p>}

      {messages.map((m) => (
        <div
          key={m.id}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontWeight: 600 }}>{m.name || "Anonym"}</span>
            <span style={{ fontSize: 12, opacity: 0.5 }}>
              {new Date(m.created_at).toLocaleString("nb-NO")}
            </span>
          </div>
          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 10 }}>{m.email}</p>
          <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 14, whiteSpace: "pre-wrap" }}>{m.messages}</p>
          <a
            href={`mailto:${m.email}?subject=${encodeURIComponent("Svar fra Scavenger")}`}
            style={{
              display: "inline-block",
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Svar
          </a>
        </div>
      ))}
    </main>
  );
}
