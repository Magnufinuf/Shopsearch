"use client";

import { useEffect, useState } from "react";

export default function InnstillingerPage() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("shopsearch_theme");
    const isDark = saved === "dark";
    setDarkMode(isDark);
    applyTheme(isDark);
  }, []);

  function applyTheme(isDark: boolean) {
    document.body.style.backgroundColor = isDark ? "#0a0a0a" : "#ffffff";
    document.body.style.color = isDark ? "#ededed" : "#171717";
  }

  function toggleDarkMode() {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem("shopsearch_theme", newValue ? "dark" : "light");
    applyTheme(newValue);
  }

  return (
    <main style={{ padding: 24, maxWidth: 600 }}>
      <h1>Innstillinger</h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 0",
          borderBottom: "1px solid #ddd",
        }}
      >
        <span>Lys modus</span>

        <button
          onClick={toggleDarkMode}
          style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            border: "none",
            background: darkMode ? "#444" : "#ccc",
            position: "relative",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: darkMode ? 24 : 2,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.15s ease",
            }}
          />
        </button>

        <span>Mørk modus</span>
      </div>

      <p style={{ marginTop: 16, color: "#888" }}>
        Flere innstillinger (bedriftsinfo, konto, språk) kommer snart.
      </p>
    </main>
  );
}
