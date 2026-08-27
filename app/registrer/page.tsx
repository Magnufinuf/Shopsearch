"use client";
import { useState } from "react";

export default function Registrer() {
  const [storeDomain, setStoreDomain] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
          <h1 className="text-2xl font-semibold text-black dark:text-white">Butikken din er koblet til!</h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">Produktene dine vil nå dukke opp i søket automatisk.</p>
          <a href="/" className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-white dark:bg-white dark:text-black">Gå til søket</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <main className="w-full max-w-md">
        <h1 className="text-center text-3xl font-semibold text-black dark:text-white">Registrer butikken din</h1>
        <p className="mt-3 text-center text-zinc-600 dark:text-zinc-400">Koble til Shopify-butikken din, og produktene dine blir søkbare med en gang.</p>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Butikknavn (valgfritt)
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="F.eks. Auto Collections" className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Shopify-domene
            <input type="text" required value={storeDomain} onChange={(e) => setStoreDomain(e.target.value)} placeholder="dinbutikk.myshopify.com" className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Klient-ID
            <input type="text" required value={clientId} onChange={(e) => setClientId(e.target.value)} className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Hemmelighet
            <input type="password" required value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <button type="submit" disabled={status === "loading"} className="mt-2 rounded-full bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black">
            {status === "loading" ? "Kobler til..." : "Koble til butikken"}
          </button>
          {status === "error" && <p className="text-sm text-red-500">{errorMsg}</p>}
        </form>
        <p className="mt-6 text-center text-xs text-zinc-400">Du finner Klient-ID og Hemmelighet i Shopify sitt Dev Dashboard, under din app sine Appinnstillinger.</p>
      </main>
    </div>
  );
}
