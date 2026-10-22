"use client";

import { useState } from "react";
import { locale, useLang, useT } from "@/lib/i18n";

type Message = {
  id: string;
  name: string;
  email: string;
  messages: string;
  created_at: string;
};

function ReplyBox({ message, password }: { message: Message; password: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSend() {
    if (!reply.trim()) return;
    setSending(true);
    setStatus("");
    const res = await fetch("/api/messages/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: message.email,
        subject: "Svar fra Scavenger",
        body: reply,
        password,
      }),
    });
    setSending(false);
    if (res.ok) {
      setStatus(t("Svar sendt!"));
      setReply("");
      setTimeout(() => setOpen(false), 1200);
    } else {
      setStatus(t("Noe gikk galt, prøv igjen."));
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-block",
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          backgroundColor: "transparent",
          color: "var(--foreground)",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {t("Svar")}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder={t("Skriv svaret ditt her...")}
        rows={4}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          backgroundColor: "transparent",
          color: "var(--foreground)",
          fontSize: 14,
          boxSizing: "border-box",
          marginBottom: 8,
          resize: "vertical",
        }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            backgroundColor: "var(--primary)",
            color: "white",
            border: "none",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {sending ? t("Sender...") : t("Send svar")}
        </button>
        <button
          onClick={() => setOpen(false)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            backgroundColor: "transparent",
            color: "var(--foreground)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {t("Avbryt")}
        </button>
        {status && <span style={{ fontSize: 13, opacity: 0.75 }}>{status}</span>}
      </div>
    </div>
  );
}

export default function InnboksPage() {
  const t = useT();
  const lang = useLang();
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
      setError(t("Feil passord"));
      return;
    }
    setMessages(data.messages || []);
    setAuthenticated(true);
  }

  if (!authenticated) {
    return (
      <main style={{ padding: "48px 24px", maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 26, fontWeight: 600, marginBottom: 20 }}>
          {t("Innboks")}
        </h1>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("Passord")}
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
            {loading ? t("Sjekker...") : t("Logg inn")}
          </button>
          {error && <p style={{ color: "#e05252", fontSize: 13, marginTop: 10 }}>{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main style={{ padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 26, fontWeight: 600, marginBottom: 24 }}>
        {t("Innboks")}
      </h1>

      {messages.length === 0 && <p style={{ opacity: 0.6 }}>{t("Ingen meldinger ennå.")}</p>}

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
            <span style={{ fontWeight: 600 }}>{m.name || t("Anonym")}</span>
            <span style={{ fontSize: 12, opacity: 0.5 }}>
              {new Date(m.created_at).toLocaleString(locale(lang))}
            </span>
          </div>
          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 10 }}>{m.email}</p>
          <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 14, whiteSpace: "pre-wrap" }}>{m.messages}</p>
          <ReplyBox message={m} password={password} />
        </div>
      ))}
    </main>
  );
}
