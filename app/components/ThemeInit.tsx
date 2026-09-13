"use client";

import { useEffect } from "react";

export default function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem("shopsearch_theme");
    const isDark = saved === "dark";
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  return null;
}
