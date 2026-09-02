"use client";
import { useState, useEffect } from "react";
import { translations, detectLocale, Locale } from "@/lib/translations";

export default function Installer() {
  const [shop, setShop] = useState("");
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setLocale(detectLocale(navigator.language));
  }, []);

  const t = translations[locale];

  function handleInstall(e: React.FormEvent) {
    e.preventDefault();
    const domain = shop.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    window.location.href = `/api/auth/start?shop=${encodeURIComponent(domain)}`;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <main className="w-full max-w-md text-center">
        <h1 className="text-3xl font-semibold text-black dark:text-white">{t.installerTitle}</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">{t.installerSubtitle}</p>
        <form onSubmit={handleInstall} className="mt-8 flex flex-col gap-4">
          <input
            type="text"
            required
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder={t.installerPlaceholder}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-center dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button type="submit" className="rounded-full bg-black px-6 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black">
            {t.installerButton}
          </button>
        </form>
      </main>
    </div>
  );
}
