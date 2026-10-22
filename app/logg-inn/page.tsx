"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchUser } from "@/lib/user-client";
import { useT } from "@/lib/i18n";
import UsernameForm from "../components/UsernameForm";

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

const EMAIL_KEY = "scavenger_last_email";

// Bare interne stier, så lenken ikke kan sende folk til en annen nettside.
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("neste") || "/min-side";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/min-side";
}

export default function LoggInn() {
  const t = useT();
  const [step, setStep] = useState<"email" | "code" | "username">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUser().then((u) => {
      if (u.loggedIn && u.username) window.location.assign(nextPath());
      else if (u.loggedIn) setStep("username");
      else {
        // Husk e-posten fra sist, så du slipper å skrive den igjen.
        try {
          const saved = localStorage.getItem(EMAIL_KEY);
          if (saved) setEmail((current) => current || saved);
        } catch {}
      }
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
      setError(data.error || t("Noe gikk galt, prøv igjen."));
      return;
    }
    try {
      localStorage.setItem(EMAIL_KEY, email.trim());
    } catch {}
    setStep("code");
    setInfo(t("Vi har sendt en kode til {epost}.", { epost: email.trim() }));
  }

  async function verifyCode(e?: React.FormEvent, codeValue = code) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/user/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: codeValue }),
    });
    const data = await res.json();
    if (res.ok && data.needsUsername) {
      setLoading(false);
      setStep("username");
      return;
    }
    if (res.ok) {
      window.location.assign(nextPath());
      return;
    }
    setLoading(false);
    setError(data.error || t("Noe gikk galt, prøv igjen."));
  }

  return (
    <main style={{ minHeight: "var(--page-h)", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/logo.png" alt="" style={{ width: 48, height: 48, objectFit: "contain", margin: "0 auto 12px", display: "block" }} />
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 6px" }}>{step === "username" ? t("Nesten ferdig!") : t("Logg inn")}</h1>
          {step !== "username" && <p style={{ margin: 0, opacity: 0.65, fontSize: 15 }}>{t("Lagre annonser og finn dem igjen senere")}</p>}
        </div>

        {step === "username" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 15, textAlign: "center" }}>
              <strong>{t("Velg et brukernavn")}</strong>
              <br />
              <span style={{ opacity: 0.7, fontSize: 14 }}>{t("Det vises på kommentarene dine, og venner kan sende deg annonser med det.")}</span>
            </p>
            <UsernameForm buttonLabel={t("Ferdig")} onSaved={() => window.location.assign(nextPath())} />
          </div>
        ) : step === "email" ? (
          <form onSubmit={sendCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email"
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("din@epost.no")}
              style={input}
            />
            <button type="submit" disabled={!email || loading} style={{ ...primaryButton, opacity: !email || loading ? 0.6 : 1 }}>
              {loading ? t("Sender...") : t("Send meg en kode")}
            </button>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.6, textAlign: "center" }}>
              {t("Ingen passord. Du får en kode på e-post. Er du ny, lages kontoen automatisk.")}
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
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(value);
                // Logg inn med en gang alle 6 tallene er skrevet inn.
                if (value.length === 6 && !loading) verifyCode(undefined, value);
              }}
              placeholder="123456"
              style={{ ...input, textAlign: "center", fontSize: 24, letterSpacing: 8 }}
            />
            <button type="submit" disabled={code.length !== 6 || loading} style={{ ...primaryButton, opacity: code.length !== 6 || loading ? 0.6 : 1 }}>
              {loading ? t("Sjekker...") : t("Logg inn")}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0 }}>
                ← {t("Annen e-post")}
              </button>
              <button type="button" onClick={() => sendCode()} disabled={loading} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0 }}>
                {t("Send ny kode")}
              </button>
            </div>
          </form>
        )}

        {error && <p style={{ color: "#e05252", fontSize: 14, marginTop: 14, textAlign: "center" }}>{error}</p>}

        <p style={{ textAlign: "center", fontSize: 13, marginTop: 32, opacity: 0.7 }}>
          {t("Har du en butikk?")} <Link href="/logg-inn-bedrift" style={{ color: "var(--primary)" }}>{t("Logg inn som bedrift")}</Link>
        </p>
        <p style={{ textAlign: "center", fontSize: 12, opacity: 0.5, marginTop: 8 }}>
          <Link href="/vilkar">{t("Vilkår")}</Link> · <Link href="/personvern">{t("Personvern")}</Link>
        </p>
      </div>
    </main>
  );
}
