"use client";

import WooConnectForm from "../components/WooConnectForm";
import { useState } from "react";

export default function Registrer() {
  const [storeDomain, setStoreDomain] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [shop, setShop] = useState("");
  const [showManual, setShowManual] = useState(false);

  // "dinbutikk" eller "https://dinbutikk.myshopify.com/" -> "dinbutikk.myshopify.com"
  function connectWithShopify(e: React.FormEvent) {
    e.preventDefault();
    let domain = shop.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain.includes(".")) domain = `${domain}.myshopify.com`;
    window.location.assign(`/api/auth/start?shop=${encodeURIComponent(domain)}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeDomain, clientId, clientSecret, displayName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Noe gikk galt");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Ukjent feil");
    }
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-black dark:text-white">
            Butikken din er koblet til! 🎉
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Produktene dine vil nå dukke opp i søket automatisk.
          </p>
          <a
            href="/admin"
            className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-white dark:bg-white dark:text-black"
          >
            Gå til administrasjon
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 py-16" style={{ minHeight: "var(--page-h)" }}>
      <main className="w-full max-w-md">
        <h1 className="text-center text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
          Koble til butikken din
        </h1>
        <p className="mt-3 text-center" style={{ color: "var(--foreground)", opacity: 0.7 }}>
          Produktene dine blir søkbare på Scavenger med en gang. Gratis i lanseringsperioden.
        </p>

        <ul className="mt-6 flex flex-col gap-2 text-sm" style={{ color: "var(--foreground)", opacity: 0.85 }}>
          <li>✓ Ett klikk – ingen nøkler å finne frem</li>
          <li>✓ Du bestemmer selv hvilke produkter som vises</li>
          <li>✓ Koble fra når du vil under Administrasjon</li>
        </ul>

        <form onSubmit={connectWithShopify} className="mt-8 flex flex-col gap-3">
          <label className="text-sm" style={{ color: "var(--foreground)", opacity: 0.7 }} htmlFor="shop">
            Butikkens Shopify-adresse
          </label>
          <input
            id="shop"
            type="text"
            required
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder="dinbutikk.myshopify.com"
            autoCapitalize="none"
            autoCorrect="off"
            className="rounded-xl border px-4 py-3 text-base"
            style={{ borderColor: "var(--border)", backgroundColor: "transparent", color: "var(--foreground)" }}
          />
          <button
            type="submit"
            disabled={!shop.trim()}
            className="rounded-xl px-6 py-3 font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#5E8E3E" }}
          >
            Koble til med Shopify
          </button>
          <p className="text-center text-xs" style={{ color: "var(--foreground)", opacity: 0.6 }}>
            Ved å koble til godtar du <a href="/vilkar" className="underline">vilkårene</a> og{" "}
            <a href="/personvern" className="underline">personvernerklæringen</a>.
          </p>
        </form>

        {/* WooCommerce */}
        <div className="mt-8">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, opacity: 0.5, fontSize: 13 }}>
            <span style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
            Bruker du WooCommerce?
            <span style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
          </div>
          <WooConnectForm />
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="text-sm underline"
            style={{ color: "var(--foreground)", opacity: 0.6 }}
          >
            {showManual ? "Skjul manuell oppkobling" : "Har du laget en egen app i Shopify? Koble til manuelt"}
          </button>
        </div>

        {showManual && (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Butikknavn (valgfritt)
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="F.eks. Auto Collections"
              className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Shopify-domene
            <input
              type="text"
              required
              value={storeDomain}
              onChange={(e) => setStoreDomain(e.target.value)}
              placeholder="dinbutikk.myshopify.com"
              className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Klient-ID
            <input
              type="text"
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Hemmelighet
            <input
              type="password"
              required
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-2 rounded-full bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {status === "loading" ? "Kobler til..." : "Koble til butikken"}
          </button>

          <p className="text-xs text-zinc-500">
            Ved å koble til godtar du <a href="/vilkar" className="underline">vilkårene</a> og{" "}
            <a href="/personvern" className="underline">personvernerklæringen</a>.
          </p>

          {status === "error" && (
            <p className="text-sm text-red-500">{errorMsg}</p>
          )}
        </form>
        )}

        {showManual && (
          <p className="mt-6 text-center text-xs text-zinc-400">
            Du finner Klient-ID og Hemmelighet i Shopify sitt Dev Dashboard,
            under din app sine Appinnstillinger.
            Ta vare på hemmeligheten – du bruker den til å logge inn senere.
          </p>
        )}
      </main>
    </div>
  );
}
