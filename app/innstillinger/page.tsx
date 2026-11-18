"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { fetchSession } from "@/lib/session-client";
import { fetchUser, logoutUser, UserInfo } from "@/lib/user-client";
import { CURRENCY_KEY } from "@/lib/currency";
import CurrencyPicker from "../components/CurrencyPicker";
import { THEME_KEY, ThemeChoice, applyTheme, readTheme } from "@/lib/theme";
import { languageName, useLang, useT } from "@/lib/i18n";
import UsernameForm from "../components/UsernameForm";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
      <h2 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 14 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

// Rad med tittel/forklaring til venstre og kontroll til høyre.
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 0" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (on: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{ position: "relative", width: 50, height: 28, borderRadius: 999, border: "none", cursor: "pointer", padding: 0, opacity: disabled ? 0.5 : 1, backgroundColor: on ? "var(--primary)" : "#bbb" }}
    >
      <span style={{ position: "absolute", top: 2, left: on ? 24 : 2, width: 24, height: 24, borderRadius: "50%", backgroundColor: "white", transition: "left 0.15s ease" }} />
    </button>
  );
}

// Knapperad der ett valg er aktivt (f.eks. Lys / Mørk / Automatisk).
function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            backgroundColor: value === o.value ? "var(--primary)" : "transparent",
            color: value === o.value ? "white" : "var(--foreground)",
            fontSize: 14,
            fontWeight: value === o.value ? 600 : 400,
            cursor: "pointer",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
};

const linkButton: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--primary)",
  fontSize: 14,
  cursor: "pointer",
};

export default function InnstillingerPage() {
  const [theme, setTheme] = useState<ThemeChoice>("light");
  const lang = useLang();
  // Valutanavnene lages av nettleseren (serveren kan skrive dem litt annerledes), så de vises først etter innlasting.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const t = useT();
  const [currency, setCurrency] = useState("auto");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [notify, setNotify] = useState<{ notifyShares: boolean; notifyMentions: boolean; notifyPriceDrops?: boolean; ready: boolean; priceDropsReady?: boolean } | null>(null);
  const [notifyMessage, setNotifyMessage] = useState("");

  // Bare for å vite om lenken «Har du en butikk?» skal vises. Butikkinnstillinger ligger i Administrasjon.
  const [domain, setDomain] = useState("");

  useEffect(() => {
    // Lagrede valg i nettleseren (leses etter første visning, så server og nettleser er enige).
    Promise.resolve().then(() => {
      setTheme(readTheme());
      try {
        setCurrency(localStorage.getItem(CURRENCY_KEY) || "auto");
      } catch {}
    });

    fetchUser().then((u) => {
      setUser(u);
      if (u.loggedIn) {
        fetch("/api/user/settings")
          .then((res) => res.json())
          .then(setNotify);
      }
    });

    fetchSession().then((s) => setDomain(s.shop || ""));
  }, []);

  function chooseTheme(choice: ThemeChoice) {
    setTheme(choice);
    try {
      localStorage.setItem(THEME_KEY, choice);
    } catch {}
    applyTheme(choice);
  }



  function chooseCurrency(value: string) {
    setCurrency(value);
    try {
      if (value === "auto") localStorage.removeItem(CURRENCY_KEY);
      else localStorage.setItem(CURRENCY_KEY, value);
    } catch {}
  }

  async function saveNotify(change: { notifyShares?: boolean; notifyMentions?: boolean; notifyPriceDrops?: boolean }) {
    if (!notify) return;
    const previous = notify;
    setNotify({ ...notify, ...change });
    setNotifyMessage("");
    const res = await fetch("/api/user/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    });
    if (!res.ok) {
      setNotify(previous);
      setNotifyMessage(t("Kunne ikke lagre. Prøv igjen senere."));
    }
  }

  async function deleteAccount() {
    if (!confirm(t("Slette kontoen din? Alle lagrede annonser forsvinner. Dette kan ikke angres."))) return;
    const res = await fetch("/api/user/delete", { method: "POST" });
    if (res.ok) window.location.assign("/");
    else alert(t("Noe gikk galt, prøv igjen."));
  }


  return (
    <main style={{ padding: "48px 24px", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 28, fontWeight: 600, marginBottom: 24 }}>
        {t("Innstillinger")}
      </h1>

      {/* Konto */}
      <Panel title={t("Konto")}>
        {user === null ? (
          <p style={{ opacity: 0.6, margin: 0 }}>{t("Laster...")}</p>
        ) : !user.loggedIn ? (
          <Row label={t("Du er ikke logget inn")} hint={t("Logg inn for å lagre, dele og kommentere annonser.")}>
            <Link href="/logg-inn?neste=/innstillinger" style={{ padding: "8px 16px", borderRadius: 10, backgroundColor: "var(--primary)", color: "white", fontWeight: 600, fontSize: 14 }}>
              {t("Logg inn")}
            </Link>
          </Row>
        ) : (
          <>
            <Row label={t("Brukernavn")} hint={user.username ?? t("Ikke valgt")}>
              <button onClick={() => setEditingUsername((v) => !v)} style={linkButton}>
                {editingUsername ? t("Avbryt") : t("Endre")}
              </button>
            </Row>
            {editingUsername && (
              <div style={{ paddingBottom: 10 }}>
                <UsernameForm
                  initial={user.username || ""}
                  onSaved={(username) => {
                    setUser({ ...user, username });
                    setEditingUsername(false);
                  }}
                />
              </div>
            )}
            <Row label={t("E-post")} hint={user.email ?? ""}>
              <span />
            </Row>
            <Row label={t("Lagrede og mottatte annonser")}>
              <Link href="/min-side" style={{ ...linkButton, textDecoration: "none" }}>{t("Min side")} →</Link>
            </Row>
            <div style={{ display: "flex", gap: 20, paddingTop: 10, borderTop: "1px solid var(--border)", marginTop: 6 }}>
              <button onClick={logoutUser} style={linkButton}>{t("Logg ut")}</button>
              <button onClick={deleteAccount} style={{ ...linkButton, color: "#e05252" }}>{t("Slett kontoen min")}</button>
            </div>
          </>
        )}
      </Panel>

      {/* Varsler */}
      {user?.loggedIn && (
        <Panel title={t("Varsler på e-post")}>
          {notify === null ? (
            <p style={{ opacity: 0.6, margin: 0 }}>{t("Laster...")}</p>
          ) : (
            <>
              <Row label={t("Når noen sender meg en annonse")}>
                <Toggle on={notify.notifyShares} disabled={!notify.ready} onChange={(on) => saveNotify({ notifyShares: on })} />
              </Row>
              <Row label={t("Når noen tagger meg i en kommentar")}>
                <Toggle on={notify.notifyMentions} disabled={!notify.ready} onChange={(on) => saveNotify({ notifyMentions: on })} />
              </Row>
              <Row label={t("Når et lagret produkt blir billigere")}>
                <Toggle on={notify.notifyPriceDrops !== false} disabled={!notify.priceDropsReady} onChange={(on) => saveNotify({ notifyPriceDrops: on })} />
              </Row>
              {(!notify.ready || !notify.priceDropsReady) && <p style={{ fontSize: 12, opacity: 0.6, margin: "6px 0 0" }}>{t("Kommer snart.")}</p>}
              {notifyMessage && <p style={{ fontSize: 13, color: "#e05252", margin: "6px 0 0" }}>{notifyMessage}</p>}
            </>
          )}
        </Panel>
      )}

      {/* Språk */}
      <Panel title={t("Språk")}>
        <Row label={languageName(lang, lang)} hint={lang === "no" || lang === "en" ? undefined : t("Oversatt automatisk")}>
          <Link href="/innstillinger/sprak" style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", color: "var(--foreground)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            {t("Bytt språk")}
          </Link>
        </Row>
      </Panel>

      {/* Utseende */}
      <Panel title={t("Utseende")}>
        <Segmented<ThemeChoice>
          value={theme}
          onChange={chooseTheme}
          options={[
            { value: "light", label: "☀️ " + t("Lys") },
            { value: "dark", label: "🌙 " + t("Mørk") },
            { value: "system", label: "⚙️ " + t("Automatisk") },
          ]}
        />
        <p style={{ fontSize: 12, opacity: 0.6, margin: "10px 0 0" }}>{t("Automatisk følger innstillingen på telefonen eller PC-en.")}</p>
      </Panel>

      {/* Valuta */}
      <Panel title={t("Valuta")}>
        <p style={{ fontSize: 13, opacity: 0.7, margin: "0 0 8px" }}>{t("Vis priser i")}</p>
        {mounted ? (
          <CurrencyPicker value={currency} onChange={chooseCurrency} />
        ) : (
          <div style={{ height: 44 }} />
        )}
        <p style={{ fontSize: 12, opacity: 0.6, margin: "8px 0 0" }}>{t("Automatisk velger valuta ut fra landet du er i.")}</p>
        <p style={{ fontSize: 11, opacity: 0.5, margin: "8px 0 0" }}>
          {t("Valutakurser fra")} <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>ExchangeRate-API</a> {t("og ECB")}
        </p>
      </Panel>


      {/* Om */}
      <Panel title={t("Om Scavenger")}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 14 }}>
          <Link href="/kontakt" style={{ color: "var(--primary)" }}>{t("Kontakt oss")}</Link>
          <Link href="/personvern" style={{ color: "var(--primary)" }}>{t("Personvern")}</Link>
          <Link href="/vilkar" style={{ color: "var(--primary)" }}>{t("Vilkår")}</Link>
          {!domain && <Link href="/registrer" style={{ color: "var(--primary)" }}>{t("Har du en butikk? Koble den til")}</Link>}
        </div>
      </Panel>
    </main>
  );
}
