"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function KontaktPage() {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");

    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, messages }),
    });

    setSending(false);

    if (res.ok) {
      setSent(true);
      setName("");
      setEmail("");
      setMessages("");
    } else {
      setError(t("Noe gikk galt. Prøv igjen."));
    }
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
    marginBottom: 14,
  };

  return (
    <main style={{ padding: "48px 24px", maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
        {t("Kontakt oss")}
      </h1>
      <p style={{ opacity: 0.7, fontSize: 14, marginBottom: 24 }}>
        {t("Har du et spørsmål, et samarbeidsforslag, eller noe annet? Send oss en melding.")}
      </p>

      {sent ? (
        <p style={{ opacity: 0.85 }}>{t("Takk! Meldingen din er sendt.")}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={t("Navn (valgfritt)")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder={t("E-post")}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder={t("Melding")}
            required
            rows={5}
            value={messages}
            onChange={(e) => setMessages(e.target.value)}
            style={inputStyle}
          />
          {error && <p style={{ color: "#e05252", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button
            type="submit"
            disabled={sending}
            style={{ padding: "10px 24px", borderRadius: 10, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            {sending ? t("Sender...") : t("Send melding")}
          </button>
          <p style={{ fontSize: 12, opacity: 0.6, marginTop: 12 }}>
            {t("Vi lagrer navn, e-post og meldingen din for å kunne svare. Les mer i")}{" "}
            <Link href="/personvern" style={{ color: "var(--primary)" }}>{t("personvernerklæringen")}</Link>.
          </p>
        </form>
      )}
    </main>
  );
}
