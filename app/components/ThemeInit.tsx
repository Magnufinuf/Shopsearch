"use client";

import { useEffect } from "react";
import { applyTheme, readTheme } from "@/lib/theme";

export default function ThemeInit() {
  useEffect(() => {
    applyTheme(readTheme());
    // «Automatisk»: bytt når telefonen/PC-en bytter mellom lys og mørk.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readTheme() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return null;
}
