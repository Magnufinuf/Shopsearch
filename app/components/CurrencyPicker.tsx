"use client";

import { useMemo, useState } from "react";
import { POPULAR_CURRENCIES, SUPPORTED_CURRENCIES, currencyName } from "@/lib/currency";
import { LANGUAGE_CODES, locale, useLang, useT } from "@/lib/i18n";

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Valutavelger med søkefelt øverst i lista. Man kan søke på koden eller navnet, på mange språk.
// value "auto" = velg ut fra landet.
export default function CurrencyPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const loc = locale(lang);

  const searchIndex = useMemo(() => {
    if (!open) return new Map<string, string>();
    const locales = Array.from(new Set([loc, "nb-NO", "en", ...LANGUAGE_CODES.slice(0, 60).map(locale)]));
    return new Map(SUPPORTED_CURRENCIES.map((c) => [c, normalize([c, ...locales.map((l) => currencyName(c, l))].join(" "))]));
  }, [open, loc]);

  const q = normalize(query.trim());
  const matches = (c: string) => !q || (searchIndex.get(c) || c.toLowerCase()).includes(q);
  const popular = POPULAR_CURRENCIES.filter(matches);
  // Treff på koden eller navnet på brukerens språk eller engelsk først, deretter treff på andre språk.
  const strong = (c: string) => !q || normalize(`${c} ${currencyName(c, loc)} ${currencyName(c, "en")}`).includes(q);
  const rest = SUPPORTED_CURRENCIES.filter((c) => !POPULAR_CURRENCIES.includes(c) && matches(c)).sort(
    (a, b) => Number(strong(b)) - Number(strong(a)) || currencyName(a, loc).localeCompare(currencyName(b, loc), loc)
  );

  function pick(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  const item = (code: string, text: string) => (
    <li key={code}>
      <button
        type="button"
        onClick={() => pick(code)}
        style={{ display: "flex", justifyContent: "space-between", gap: 10, width: "100%", padding: "10px 12px", background: code === value ? "var(--border)" : "none", border: "none", color: "var(--foreground)", fontSize: 14, textAlign: "start", cursor: "pointer" }}
      >
        <span>{text}</span>
        {code === value && <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓</span>}
      </button>
    </li>
  );
  const heading = (text: string) => (
    <li style={{ padding: "8px 12px 2px", fontSize: 11, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.8 }}>{text}</li>
  );

  return (
    <div style={{ width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "none", color: "var(--foreground)", fontSize: 15, cursor: "pointer", textAlign: "start" }}
      >
        <span>{value === "auto" ? t("Automatisk") : `${value} – ${currencyName(value, loc)}`}</span>
        <span style={{ opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 6, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Søk etter valuta")}
            aria-label={t("Søk etter valuta")}
            style={{ width: "100%", padding: "11px 12px", border: "none", borderBottom: "1px solid var(--border)", background: "none", color: "var(--foreground)", fontSize: 15, boxSizing: "border-box", outline: "none" }}
          />
          <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 280, overflowY: "auto" }}>
            {!q && item("auto", t("Automatisk"))}
            {popular.length > 0 && heading(t("Vanlige"))}
            {popular.map((c) => item(c, `${c} – ${currencyName(c, loc)}`))}
            {rest.length > 0 && heading(t("Alle valutaer"))}
            {rest.map((c) => item(c, `${c} – ${currencyName(c, loc)}`))}
            {popular.length + rest.length === 0 && <li style={{ padding: 12, fontSize: 14, opacity: 0.6 }}>{t("Fant ingen valuta")}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
