"use client";
import { useState, useEffect } from "react";
import { translations, detectLocale, Locale } from "@/lib/translations";

export default function Suksess() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setLocale(detectLocale(navigator.language));
  }, []);

  const t = translations[locale];

  return (
    <div className="flex items-center justify-center px-6" style={{ minHeight: "var(--page-h)" }}>
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">{t.successTitle}</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">{t.successSubtitle}</p>
        <a href="/admin" className="mt-6 inline-block rounded-full px-6 py-3 font-semibold text-white" style={{ backgroundColor: "var(--primary)" }}>Gå til administrasjon</a>
      </div>
    </div>
  );
}
