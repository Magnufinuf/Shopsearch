"use client";

import { useEffect, useState } from "react";

export default function InnstillingerPage() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("shopsearch_theme");
    setDarkMode(saved === "dark");
  }, []);

  function toggleDarkMode() {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem("shopsearch_theme", newValue ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newValue);
  }

  return (
    <main className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4 dark:text-white">Innstillinger</h1>

      <div className="flex items-center gap-3 py-4 border-b border-zinc-300 dark:border-zinc-700">
        <span className="dark:text-white">Lys modus</span>

        <button
          onClick={toggleDarkMode}
          className="relative w-[50px] h-7 rounded-full border-none cursor-pointer p-0"
          style={{ background: darkMode ? "#444" : "#ccc" }}
        >
          <span
            className="absolute top-[2px] w-6 h-6 rounded-full bg-white transition-all"
            style={{ left: darkMode ? 24 : 2 }}
          />
        </button>

        <span className="dark:text-white">Mørk modus</span>
      </div>

      <p className="mt-4 text-zinc-500 dark:text-zinc-400">
        Flere innstillinger (bedriftsinfo, konto, språk) kommer snart.
      </p>
    </main>
  );
}
