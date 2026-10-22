"use client";
// Språk på nettsiden: norsk eller engelsk. Valget lagres i nettleseren.
// Teksten skrives på norsk i koden, t("Lagre") gir "Save" på engelsk.
import { useCallback, useSyncExternalStore } from "react";
import { EN } from "./en";

export type Lang = "no" | "en";
export const LANG_KEY = "scavenger_lang";
const CHANGE_EVENT = "scavenger-lang-change";

export const LANGUAGES: { value: Lang; label: string }[] = [
  { value: "no", label: "Norsk" },
  { value: "en", label: "English" },
];

// Uten eget valg: norsk for norske nettlesere, ellers engelsk.
export function readLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "no" || saved === "en") return saved;
  } catch {}
  const browser = (typeof navigator !== "undefined" && navigator.language) || "no";
  return /^(nb|nn|no)\b/i.test(browser) ? "no" : "en";
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
  document.documentElement.lang = lang;
  window.dispatchEvent(new Event(CHANGE_EVENT));
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

// Oversetter norsk tekst. {navn} i teksten byttes ut med vars.navn.
export function translate(lang: Lang, text: string, vars?: Record<string, string | number>): string {
  let out = lang === "en" ? EN[text] ?? text : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

export function useT() {
  const lang = useLang();
  return useCallback((text: string, vars?: Record<string, string | number>) => translate(lang, text, vars), [lang]);
}

// Datoer og tall i valgt språk.
export function locale(lang: Lang) {
  return lang === "en" ? "en-GB" : "nb-NO";
}
