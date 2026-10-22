"use client";

import { useState } from "react";
import { USERNAME_RULES } from "@/lib/username";
import { useT } from "@/lib/i18n";

const field: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  fontSize: 16,
  boxSizing: "border-box",
};

// Velg / endre brukernavn. Kaller onSaved med det nye navnet.
export default function UsernameForm({
  initial = "",
  buttonLabel,
  onSaved,
}: {
  initial?: string;
  buttonLabel?: string;
  onSaved: (username: string) => void;
}) {
  const t = useT();
  const [username, setUsername] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/user/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) onSaved(data.username);
    else setError(data.error || t("Noe gikk galt, prøv igjen."));
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0, display: "flex" }}>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
            maxLength={20}
            placeholder={t("brukernavn")}
            autoCapitalize="none"
            autoCorrect="off"
            style={field}
          />
        </div>
        <button
          type="submit"
          disabled={username.length < 3 || saving}
          style={{ flexShrink: 0, padding: "0 18px", borderRadius: 12, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: username.length < 3 || saving ? 0.6 : 1 }}
        >
          {saving ? "..." : buttonLabel ?? t("Lagre")}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 12, opacity: error ? 1 : 0.6, color: error ? "#e05252" : undefined }}>
        {error || t(USERNAME_RULES)}
      </p>
    </form>
  );
}
