"use client";

import { useState } from "react";

// Vindu for å sende en annonse til en venn på e-post / i Scavenger-innboksen deres.
export default function SendAdvertDialog({ advertId, onClose }: { advertId: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const res = await fetch("/api/user/send-advert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advertId, email, message }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus("sent");
      setTimeout(onClose, 1400);
    } else {
      setStatus("idle");
      setError(data.error || "Noe gikk galt, prøv igjen.");
    }
  }

  const field: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    backgroundColor: "transparent",
    color: "var(--foreground)",
    fontSize: 16,
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Send annonse"
        style={{ width: "100%", maxWidth: 420, backgroundColor: "var(--background)", color: "var(--foreground)", borderRadius: 20, padding: 20, marginBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        {status === "sent" ? (
          <p style={{ textAlign: "center", fontSize: 17, fontWeight: 600, margin: "20px 0" }}>Sendt! ✉️</p>
        ) : (
          <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Send til en venn</h2>
              <button type="button" onClick={onClose} aria-label="Lukk" style={{ background: "none", border: "none", color: "var(--foreground)", fontSize: 22, cursor: "pointer", opacity: 0.6 }}>
                ×
              </button>
            </div>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Vennens e-post"
              style={field}
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Skriv en hilsen (valgfritt)"
              maxLength={300}
              rows={3}
              style={{ ...field, resize: "none" }}
            />
            <button
              type="submit"
              disabled={!email || status === "sending"}
              style={{ padding: "13px 20px", borderRadius: 12, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: !email || status === "sending" ? 0.6 : 1 }}
            >
              {status === "sending" ? "Sender..." : "Send"}
            </button>
            {error && <p style={{ color: "#e05252", fontSize: 14, margin: 0 }}>{error}</p>}
            <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
              Vennen din får en e-post med lenke. Har de konto, dukker den også opp under Min side.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
