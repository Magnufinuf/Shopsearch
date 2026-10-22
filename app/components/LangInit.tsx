"use client";

import { useEffect } from "react";
import { useLang } from "@/lib/i18n";

// Setter <html lang> til språket brukeren har valgt (for skjermlesere og oversettelse i nettleseren).
export default function LangInit() {
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
