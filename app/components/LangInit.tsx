"use client";

import { useEffect } from "react";
import { applyLang, loadDict, useLang } from "@/lib/i18n";

// Setter <html lang/dir> til språket brukeren har valgt, og henter oversettelsene.
export default function LangInit() {
  const lang = useLang();
  useEffect(() => {
    applyLang(lang);
    loadDict(lang);
  }, [lang]);
  return null;
}
