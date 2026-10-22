// Språkene man kan velge (koder fra ISO 639). Norsk og engelsk er skrevet for hånd,
// resten oversettes av AI første gang noen velger dem (se /api/translations).
// Brukes både på serveren og i nettleseren.
import { EN } from "./en";

export const LANGUAGE_CODES = [
  "af", "ak", "am", "ar", "as", "ay", "az", "be", "bg", "bm", "bn", "bo", "bs", "ca", "ceb", "ckb", "co", "cs", "cy",
  "da", "de", "dv", "ee", "el", "en", "eo", "es", "et", "eu", "fa", "ff", "fi", "fil", "fj", "fo", "fr", "fy", "ga",
  "gd", "gl", "gn", "gu", "ha", "haw", "he", "hi", "hmn", "hr", "ht", "hu", "hy", "id", "ig", "is", "it", "iu", "ja",
  "jv", "ka", "kk", "kl", "km", "kn", "ko", "ku", "ky", "la", "lb", "lg", "ln", "lo", "lt", "lv", "mg", "mi", "mk",
  "ml", "mn", "mr", "ms", "mt", "my", "ne", "nl", "no", "ny", "om", "or", "pa", "ps", "pt", "qu", "rm", "ro", "ru",
  "rw", "sa", "sd", "se", "si", "sk", "sl", "sm", "sn", "so", "sq", "sr", "st", "su", "sv", "sw", "ta", "te", "tg",
  "th", "ti", "tk", "tn", "to", "tr", "ts", "tt", "ug", "uk", "ur", "uz", "vi", "wo", "xh", "yi", "yo", "zh",
  "zh-Hant", "zu",
] as const;

export type Lang = string;

const SUPPORTED = new Set<string>(LANGUAGE_CODES);
export function isSupportedLang(code: unknown): code is Lang {
  return typeof code === "string" && SUPPORTED.has(code);
}

// Skrives fra høyre mot venstre.
const RTL = new Set(["ar", "ckb", "dv", "fa", "he", "ps", "sd", "ug", "ur", "yi"]);
export function isRtl(lang: Lang) {
  return RTL.has(lang);
}

// Kode som datoer, tall og språknavn i nettleseren forstår.
export function locale(lang: Lang) {
  if (lang === "no") return "nb-NO";
  if (lang === "en") return "en-GB";
  return lang;
}

// Navnet på et språk, skrevet på et annet språk (f.eks. "de" på norsk = "tysk").
export function languageName(code: Lang, inLang: Lang): string {
  try {
    const name = new Intl.DisplayNames([locale(inLang), "en"], { type: "language" }).of(code);
    if (name && name !== code) return name.charAt(0).toLocaleUpperCase(locale(inLang)) + name.slice(1);
  } catch {}
  return code;
}

// Endres når teksten på nettsiden endres, så gamle oversettelser ikke brukes.
export const TRANSLATION_VERSION = (() => {
  let h = 0;
  for (const key of Object.keys(EN)) for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
})();
