"use client";

import { useEffect, useState } from "react";

export default function InnstillingerPage() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("shopsearch_theme");
    const isDark = saved === "dark";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDarkMode() {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem("shopsearch_theme", newValue ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newValue);
  }

  return (
    <main style={{ padding: 24, maxWidth: 600 }}>
      <h1>Innstillinger</h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 0",
          
