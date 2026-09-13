"use client";

import { useEffect } from "react";

export default function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem("shopsearch_theme");
    const isDark = saved === "dark";
    document.body.style.backgroundColor = isDark ? "#0a0a0a" : "#ffffff";
    document.body.style.color = isDark ? "#ededed" : "#171717";
  }, []);

  return null;
}
