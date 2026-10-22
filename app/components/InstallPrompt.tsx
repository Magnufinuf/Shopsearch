"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

// Chrome/Android gir oss en «installer»-hendelse vi kan bruke på en egen knapp.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "scavenger_install_dismissed";
const DISMISS_DAYS = 30;

// Liten boks nederst på mobil: «Legg Scavenger på hjemskjermen».
// Vises ikke hvis appen allerede er installert, på PC, eller hvis den er lukket de siste 30 dagene.
export default function InstallPrompt() {
  const t = useT();
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    } catch {}
    if (standalone || Date.now() - dismissedAt < DISMISS_DAYS * 86400_000) return;

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isMobile = isIos || /Android/i.test(ua);
    if (!isMobile) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // iPhone har ingen installer-knapp, så vi forklarer hvordan (vises litt etter at siden er åpnet).
    const timer = isIos ? setTimeout(() => setMode("ios"), 1500) : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setMode(null);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    dismiss();
  }

  if (!mode) return null;

  return (
    <div
      role="dialog"
      aria-label={t("Installer Scavenger")}
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "max(12px, env(safe-area-inset-bottom))",
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 16,
        backgroundColor: "var(--background)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        color: "var(--foreground)",
      }}
    >
      <img src="/app-icon-192.png" alt="" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.35 }}>
        <strong style={{ fontSize: 14 }}>{t("Få Scavenger som app")}</strong>
        <br />
        {mode === "android" ? (
          <span style={{ opacity: 0.75 }}>{t("Legg den på hjemskjermen – gratis, ingen nedlasting.")}</span>
        ) : (
          <span style={{ opacity: 0.75 }}>
            {t("Trykk på")} <strong>{t("Del")}</strong>{t("-knappen")} <span aria-hidden>⎙</span> {t("og så")} <strong>{t("«Legg til på Hjem-skjerm»")}</strong>.
          </span>
        )}
      </div>
      {mode === "android" && (
        <button onClick={install} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "none", backgroundColor: "var(--primary)", color: "white", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          {t("Installer")}
        </button>
      )}
      <button onClick={dismiss} aria-label={t("Lukk")} style={{ flexShrink: 0, background: "none", border: "none", color: "var(--foreground)", opacity: 0.5, fontSize: 22, lineHeight: 1, cursor: "pointer", padding: 4 }}>
        ×
      </button>
    </div>
  );
}
