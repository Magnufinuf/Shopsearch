"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchUser } from "@/lib/user-client";

const input: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  fontSize: 16,
  boxSizing: "border-box",
};

const primaryButton: React.CSSProperties = {
  width: "100%",
  padding: "13px 20px",
  borderRadius: 12,
  backgroundColor: "var(--primary)",
  color: "white",
  border: "none",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};

// Bare interne stier, så lenken ikke kan sende folk til en annen nettside.
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("neste") || "/min-side";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/min-side";
}

export default function LoggInn() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUser().then((u) => {
      if (u.loggedIn) window.location.assign(nextPath());
    });
  }, []);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const res = await fetch("/api/user/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Noe gikk galt, prøv igjen.");
      return;
    }
    setStep("code");
    setInfo(`Vi har sendt en kode til ${email.trim()}.`);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/user/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (res.ok) {
      window.location.assign(nextPath());
      return;
    }
    setLoading(false);
    setError(data.error || "Noe gikk galt, prøv igjen.");
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/logo.png" alt="" style={{ width: 48, height: 48, objectFit: "contain", margin: "0 auto 12px", display: "block" }} />
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 6px" }}>Logg inn</h1>
          <p style={{ margin: 0, opacity: 0.65, fontSize: 15 }}>Lagre annonser og finn dem igjen senere</p>
        </div>

        {step === "email" ? (
          <form onSubmit={sendCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email"
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@epost.no"
              style={input}
            />
            <button type="submit" disabled={!email || loading} style={{ ...primaryButton, opacity: !email || loading ? 0.6 : 1 }}>
              {loading ? "Sender..." : "Send meg en kode"}
            </button>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.6, textAlign: "center" }}>
              Ingen passord. Du får en kode på e-post. Er du ny, lages kontoen automatisk.
            </p>
          </form>
        ) : (
          <form onSubmit={verifyCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {info && <p style={{ margin: 0, fontSize: 14, opacity: 0.8, textAlign: "center" }}>{info}</p>}
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              style={{ ...input, textAlign: "center", fontSize: 24, letterSpacing: 8 }}
            />
            <button type="submit" disabled={code.length !== 6 || loading} style={{ ...primaryButton, opacity: code.length !== 6 || loading ? 0.6 : 1 }}>
              {loading ? "Sjekker..." : "Logg inn"}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0 }}>
                ← Annen e-post
              </button>
              <button type="button" onClick={() => sendCode()} disabled={loading} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0 }}>
                Send ny kode
              </button>
            </div>
          </form>
        )}

        {error && <p style={{ color: "#e05252", fontSize: 14, marginTop: 14, textAlign: "center" }}>{error}</p>}

        <p style={{ textAlign: "center", fontSize: 13, marginTop: 32, opacity: 0.7 }}>
          Har du en butikk? <Link href="/logg-inn-bedrift" style={{ color: "var(--primary)" }}>Logg inn som bedrift</Link>
        </p>
        <p style={{ textAlign: "center", fontSize: 12, opacity: 0.5, marginTop: 8 }}>
          <Link href="/vilkar">Vilkår</Link> · <Link href="/personvern">Personvern</Link>
        </p>
      </div>
    </main>
  );
}
