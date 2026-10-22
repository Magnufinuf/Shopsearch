"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LANGUAGE_CODES, Lang, languageName, locale, setLang, useLang, useT } from "@/lib/i18n";

// Bokstaver uten aksenter og små, så «espanol» finner «Español».
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Alle språk, i alfabetisk rekkefølge, med søk. Man kan søke på språknavnet skrevet på hvilket som helst språk.
export default function VelgSprak() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Språknavnene lages av nettleseren, så listen tegnes først der (ikke på serveren).
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const languages = useMemo(() => {
    const collator = new Intl.Collator(locale(lang));
    return LANGUAGE_CODES.map((code) => ({ code, name: languageName(code, lang), native: languageName(code, code) })).sort((a, b) =>
      collator.compare(a.name, b.name)
    );
  }, [lang]);

  // Navnet på hvert språk skrevet på alle språkene i listen (lages bare når man søker).
  const searching = query !== "";
  const searchIndex = useMemo(() => {
    if (!searching) return null;
    return new Map(
      LANGUAGE_CODES.map((code) => [code, normalize([code, ...LANGUAGE_CODES.map((inLang) => languageName(code, inLang))].join(" "))])
    );
  }, [searching]);

  const q = normalize(query.trim());
  const shown = q && searchIndex ? languages.filter((l) => searchIndex.get(l.code)?.includes(q)) : languages;

  function choose(code: Lang) {
    setLang(code);
    router.push("/innstillinger");
  }

  return (
    <main style={{ padding: "48px 24px", maxWidth: 640, margin: "0 auto" }}>
      <Link href="/innstillinger" style={{ fontSize: 14, color: "var(--primary)" }}>
        ← {t("Innstillinger")}
      </Link>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 28, fontWeight: 600, margin: "12px 0 16px" }}>{t("Velg språk")}</h1>

      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("Søk etter språk")}
        aria-label={t("Søk etter språk")}
        style={{
          width: "100%",
          padding: "13px 16px",
          borderRadius: 999,
          border: "1px solid var(--border)",
          backgroundColor: "transparent",
          color: "var(--foreground)",
          fontSize: 16,
          boxSizing: "border-box",
          marginBottom: 12,
          position: "sticky",
          top: 12,
          background: "var(--background)",
          zIndex: 1,
        }}
      />

      {!mounted ? null : shown.length === 0 ? (
        <p style={{ opacity: 0.6 }}>{t("Fant ingen språk")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {shown.map((l) => {
            const active = l.code === lang;
            return (
              <li key={l.code}>
                <button
                  onClick={() => choose(l.code)}
                  lang={locale(l.code)}
                  aria-current={active ? "true" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    width: "100%",
                    padding: "12px 4px",
                    background: "none",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--foreground)",
                    textAlign: "start",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: active ? 700 : 500 }}>{l.name}</span>
                    {l.native !== l.name && <span style={{ display: "block", fontSize: 13, opacity: 0.6 }}>{l.native}</span>}
                  </span>
                  {active && <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
