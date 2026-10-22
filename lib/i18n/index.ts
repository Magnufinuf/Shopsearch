"use client";
// Språk på nettsiden. Valget lagres i nettleseren.
// Teksten skrives på norsk i koden, t("Lagre") gir "Save" på engelsk.
// Andre språk hentes fra /api/translations første gang de brukes (engelsk vises imens).
import { useCallback, useSyncExternalStore } from "react";
import { EN } from "./en";
import { LANGUAGE_CODES, Lang, TRANSLATION_VERSION, isRtl, isSupportedLang, locale } from "./languages";

export { LANGUAGE_CODES, isRtl, languageName, locale } from "./languages";
export type { Lang } from "./languages";

export const LANG_KEY = "scavenger_lang";
const CHANGE_EVENT = "scavenger-lang-change";

// Uten eget valg: språket nettleseren står på, hvis vi har det, ellers engelsk.
export function readLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (isSupportedLang(saved)) return saved;
  } catch {}
  const browser = (typeof navigator !== "undefined" && navigator.language) || "no";
  if (/^(nb|nn|no)\b/i.test(browser)) return "no";
  if (/^zh-(TW|HK|MO|Hant)/i.test(browser)) return "zh-Hant";
  const base = browser.split("-")[0].toLowerCase();
  return (LANGUAGE_CODES as readonly string[]).includes(base) ? base : "en";
}

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
  notify();
}

// Oversettelser som er hentet (fra minnet, nettleseren eller serveren).
const dicts: Record<string, Record<string, string>> = { en: EN };
const loading = new Set<string>();
const dictKey = (lang: Lang) => `scavenger_dict_${lang}_${TRANSLATION_VERSION}`;

function cachedDict(lang: Lang): Record<string, string> | undefined {
  if (dicts[lang]) return dicts[lang];
  try {
    const saved = localStorage.getItem(dictKey(lang));
    if (saved) return (dicts[lang] = JSON.parse(saved));
  } catch {}
  return undefined;
}

export function loadDict(lang: Lang) {
  if (lang === "no" || cachedDict(lang) || loading.has(lang)) return;
  loading.add(lang);
  fetch(`/api/translations?lang=${encodeURIComponent(lang)}&v=${TRANSLATION_VERSION}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data?.translations) return;
      dicts[lang] = data.translations;
      try {
        localStorage.setItem(dictKey(lang), JSON.stringify(data.translations));
      } catch {}
      notify();
    })
    .catch(() => {})
    .finally(() => loading.delete(lang));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, readLang, () => "no");
}

// Endres når oversettelsene til språket er ferdig hentet, så teksten tegnes på nytt.
function useDictReady(lang: Lang): boolean {
  return useSyncExternalStore(subscribe, () => lang === "no" || !!cachedDict(lang), () => true);
}

// Oversetter norsk tekst. {navn} i teksten byttes ut med vars.navn.
export function translate(lang: Lang, text: string, vars?: Record<string, string | number>): string {
  let out = text;
  if (lang !== "no") out = cachedDict(lang)?.[text] ?? EN[text] ?? text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

export function useT() {
  const lang = useLang();
  const ready = useDictReady(lang);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((text: string, vars?: Record<string, string | number>) => translate(lang, text, vars), [lang, ready]);
}

export function applyLang(lang: Lang) {
  document.documentElement.lang = locale(lang);
  document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
}
