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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-white">{t.successTitle}</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">{t.successSubtitle}</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-white dark:bg-white dark:text-black">{t.successButton}</a>
      </div>
    </div>
  );
}
