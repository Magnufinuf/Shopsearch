"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { fetchSession } from "@/lib/session-client";
import { RememberedAccount, forgetAccount, getRememberedAccounts } from "@/lib/remembered-accounts";
import WooConnectForm from "../components/WooConnectForm";
import WixConnectForm from "../components/WixConnectForm";

const SHOPIFY_GREEN = "#5E8E3E";

// "dinbutikk", "https://dinbutikk.myshopify.com/" -> "dinbutikk.myshopify.com"
function toShopDomain(input: string): string {
  const d = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!d) return "";
  return d.includes(".") ? d : `${d}.myshopify.com`;
}

function shopifyLoginUrl(shop: string) {
  return `/api/auth/start?login=1&shop=${encodeURIComponent(shop)}`;
}

function initials(name: string) {
  const parts = name.replace(/[-_.]/g, " ").split(" ").filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function ShopifyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="white"
        d="M7 7V6a5 5 0 0 1 10 0v1h2.2a1 1 0 0 1 1 .92l1 13A1 1 0 0 1 20.2 22H3.8a1 1 0 0 1-1-1.08l1-13A1 1 0 0 1 4.8 7H7Zm2 0h6V6a3 3 0 0 0-6 0v1Z"
      />
    </svg>
  );
}

const card: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  textAlign: "left",
  boxSizing: "border-box",
};

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

export default function LoggInnBedrift() {
  // Hentes fra nettleseren (tom liste under server-rendering).
  const [removed, setRemoved] = useState<string[]>([]);
  const accountsJson = useSyncExternalStore(
    () => () => {},
    () => JSON.stringify(getRememberedAccounts()),
    () => "[]"
  );
  const accounts = (JSON.parse(accountsJson) as RememberedAccount[]).filter((a) => !removed.includes(a.shop));
  const [shopifyEnabled, setShopifyEnabled] = useState(true);
  const [showShopifyForm, setShowShopifyForm] = useState(false);
  const [showSecretForm, setShowSecretForm] = useState(false);
  const [showWooForm, setShowWooForm] = useState(false);
  const [showWixForm, setShowWixForm] = useState(false);
  const [wooUrl, setWooUrl] = useState("");
  const [shopInput, setShopInput] = useState("");
  const [domain, setDomain] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const shopifyFailed = new URLSearchParams(window.location.search).get("feil") === "shopify";
    fetchSession().then((s) => {
      if (shopifyFailed) {
        setError("Innlogging med Shopify er ikke satt opp ennå. Bruk hemmeligheten din i stedet.");
        setShowSecretForm(true);
      }
      if (s.loggedIn) {
        window.location.assign("/admin");
        return;
      }
      setShopifyEnabled(s.shopifyEnabled);
      if (!s.shopifyEnabled) setShowSecretForm(true);
    });
  }, []);

  function continueWithAccount(shop: string, platform?: string) {
    // Wix- og WooCommerce-butikker logger inn med nøkkelen sin.
    if (platform === "wix") {
      setShowWooForm(false);
      setShowWixForm(true);
      return;
    }
    if (!shop.endsWith(".myshopify.com")) {
      setWooUrl(shop);
      setShowWixForm(false);
      setShowWooForm(true);
      return;
    }
    continueWithShopify(shop);
  }

  function continueWithShopify(shop: string) {
    if (!shopifyEnabled) {
      // Ingen Shopify-app satt opp: fyll inn domenet i hemmelighet-skjemaet i stedet.
      setDomain(shop);
      setShowSecretForm(true);
      return;
    }
    window.location.assign(shopifyLoginUrl(shop));
  }

  async function handleSecretLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: toShopDomain(domain), secret }),
    });
    const data = await res.json();
    if (res.ok) {
      window.location.assign("/admin");
      return;
    }
    setError(data.error || "Noe gikk galt, prøv igjen.");
    setLoading(false);
  }

  return (
    <main style={{ minHeight: "var(--page-h)", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/logo.png" alt="" style={{ width: 48, height: 48, objectFit: "contain", margin: "0 auto 12px", display: "block" }} />
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 6px" }}>Logg inn på Scavenger</h1>
          <p style={{ margin: 0, opacity: 0.65, fontSize: 15 }}>For butikker som selger via Scavenger</p>
        </div>

        {/* Tidligere innlogginger på denne enheten */}
        {accounts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            <p style={{ margin: "0 0 2px", fontSize: 13, opacity: 0.6 }}>Velg en butikk for å fortsette</p>
            {accounts.map((a) => (
              <div key={a.shop} style={{ ...card, padding: 0 }}>
                <button
                  onClick={() => continueWithAccount(a.shop, a.platform)}
                  style={{ ...card, border: "none", flex: 1, cursor: "pointer" }}
                >
                  <span style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, flexShrink: 0 }}>
                    {initials(a.name)}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{a.name}</span>
                    <span style={{ fontSize: 13, opacity: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.shop}</span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    forgetAccount(a.shop);
                    setRemoved((r) => [...r, a.shop]);
                  }}
                  aria-label={`Fjern ${a.name}`}
                  title="Fjern fra listen"
                  style={{ border: "none", background: "none", color: "var(--foreground)", opacity: 0.45, fontSize: 20, padding: "0 16px", cursor: "pointer", alignSelf: "stretch" }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Fortsett med Shopify */}
        {!showShopifyForm ? (
          <button
            onClick={() => setShowShopifyForm(true)}
            style={{ ...card, justifyContent: "center", backgroundColor: SHOPIFY_GREEN, border: "none", color: "white", fontWeight: 600, fontSize: 15, cursor: "pointer" }}
          >
            <ShopifyIcon />
            {accounts.length > 0 ? "Bruk en annen Shopify-butikk" : "Fortsett med Shopify"}
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const shop = toShopDomain(shopInput);
              if (shop) continueWithShopify(shop);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <label style={{ fontSize: 13, opacity: 0.7 }}>Butikkens Shopify-adresse</label>
            <input
              autoFocus
              value={shopInput}
              onChange={(e) => setShopInput(e.target.value)}
              placeholder="dinbutikk.myshopify.com"
              style={input}
            />
            <button
              type="submit"
              disabled={!shopInput.trim()}
              style={{ ...card, justifyContent: "center", backgroundColor: SHOPIFY_GREEN, border: "none", color: "white", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: shopInput.trim() ? 1 : 0.6 }}
            >
              <ShopifyIcon />
              Fortsett med Shopify
            </button>
          </form>
        )}

        {/* WooCommerce og Wix */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <button
            onClick={() => {
              setShowWixForm(false);
              setShowWooForm((v) => !v);
            }}
            style={{ ...card, justifyContent: "center", flexDirection: "column", gap: 2, padding: "12px 8px", cursor: "pointer", borderColor: showWooForm ? "#7F54B3" : "var(--border)" }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>WooCommerce</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>Koble til med nøkkel</span>
          </button>
          <button
            onClick={() => {
              setShowWooForm(false);
              setShowWixForm((v) => !v);
            }}
            style={{ ...card, justifyContent: "center", flexDirection: "column", gap: 2, padding: "12px 8px", cursor: "pointer", borderColor: showWixForm ? "var(--foreground)" : "var(--border)" }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>Wix</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>Koble til med nøkkel</span>
          </button>
        </div>
        {showWooForm && (
          <div style={{ marginTop: 14 }}>
            <WooConnectForm key={wooUrl} initialUrl={wooUrl} />
          </div>
        )}
        {showWixForm && (
          <div style={{ marginTop: 14 }}>
            <WixConnectForm />
          </div>
        )}

        {/* Reserve: hemmelighet */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 16px", opacity: 0.5, fontSize: 13 }}>
          <span style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
          eller
          <span style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
        </div>

        {!showSecretForm ? (
          <button
            onClick={() => setShowSecretForm(true)}
            style={{ width: "100%", background: "none", border: "none", color: "var(--primary)", fontSize: 14, cursor: "pointer" }}
          >
            Logg inn med hemmelighet
          </button>
        ) : (
          <form onSubmit={handleSecretLogin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="dinbutikk.myshopify.com" autoComplete="username" style={input} />
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Hemmelighet" autoComplete="current-password" style={input} />
            <button
              type="submit"
              disabled={!domain || !secret || loading}
              style={{ padding: "13px 20px", borderRadius: 12, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: !domain || !secret || loading ? 0.6 : 1 }}
            >
              {loading ? "Logger inn..." : "Logg inn"}
            </button>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
              Hemmeligheten er den samme som du limte inn da du koblet til butikken.
            </p>
          </form>
        )}

        {error && <p style={{ color: "#e05252", fontSize: 14, marginTop: 14, textAlign: "center" }}>{error}</p>}

        <p style={{ textAlign: "center", fontSize: 14, marginTop: 28, opacity: 0.8 }}>
          Ny her? <Link href="/registrer" style={{ color: "var(--primary)", fontWeight: 600 }}>Koble til butikken din</Link>
        </p>
        <p style={{ textAlign: "center", fontSize: 12, opacity: 0.5, marginTop: 8 }}>
          <Link href="/vilkar">Vilkår</Link> · <Link href="/personvern">Personvern</Link>
        </p>
      </div>
    </main>
  );
}
