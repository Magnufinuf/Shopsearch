"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSession, logout } from "@/lib/session-client";
import { fetchUser, logoutUser, UserInfo } from "@/lib/user-client";
import { CURRENCY_KEY, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { THEME_KEY, ThemeChoice, applyTheme, readTheme } from "@/lib/theme";
import { LANGUAGES, Lang, setLang, useLang, useT } from "@/lib/i18n";
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  fontSize: 15,
  boxSizing: "border-box",
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
  const t = useT();
  const [currency, setCurrency] = useState("auto");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [notify, setNotify] = useState<{ notifyShares: boolean; notifyMentions: boolean; ready: boolean } | null>(null);
  const [notifyMessage, setNotifyMessage] = useState("");

  const [domain, setDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSupported, setLogoSupported] = useState(false);
  const [logoMessage, setLogoMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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

    fetchSession().then((s) => {
      if (!s.shop) return;
      setDomain(s.shop);
      setLogoUrl(s.logoUrl || null);
      setLogoSupported(!!s.logoSupported);
      fetch("/api/store-info", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          setDisplayName(data.displayName || "");
          setContactEmail(data.contactEmail || "");
        });
    });
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

  async function saveNotify(change: { notifyShares?: boolean; notifyMentions?: boolean }) {
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

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    setLogoMessage(t("Laster opp..."));
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/store-logo", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setLogoUrl(data.logoUrl);
      setLogoMessage(t("Logoen er oppdatert!"));
    } else {
      setLogoMessage(data.error || t("Noe gikk galt, prøv igjen."));
    }
  }

  async function saveStore() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/update-store-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, contactEmail }),
    });
    setSaving(false);
    setMessage(res.ok ? t("Lagret!") : t("Noe gikk galt, prøv igjen."));
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
              {!notify.ready && <p style={{ fontSize: 12, opacity: 0.6, margin: "6px 0 0" }}>{t("Kommer snart.")}</p>}
              {notifyMessage && <p style={{ fontSize: 13, color: "#e05252", margin: "6px 0 0" }}>{notifyMessage}</p>}
            </>
          )}
        </Panel>
      )}

      {/* Språk */}
      <Panel title={t("Språk")}>
        <Segmented<Lang> value={lang} onChange={setLang} options={LANGUAGES} />
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
        <Row label={t("Vis priser i")} hint={t("Automatisk velger valuta ut fra landet du er i.")}>
          <select value={currency} onChange={(e) => chooseCurrency(e.target.value)} style={{ ...inputStyle, width: "auto", paddingRight: 32 }}>
            <option value="auto">{t("Automatisk")}</option>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Row>
      </Panel>

      {/* Bedrift */}
      {domain && (
        <Panel title={t("Bedrift")}>
          <p style={{ fontSize: 13, opacity: 0.6, marginTop: 0 }}>{domain}</p>
          {logoSupported && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              {logoUrl ? (
                <img src={logoUrl} alt={t("Logo")} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)", backgroundColor: "white" }} />
              ) : (
                <span style={{ width: 56, height: 56, borderRadius: "50%", border: "2px dashed var(--border)" }} />
              )}
              <label style={{ ...linkButton, cursor: "pointer" }}>
                {logoUrl ? t("Bytt logo") : t("Last opp logo")}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadLogo(e.target.files?.[0])} style={{ display: "none" }} />
              </label>
              {logoMessage && <span style={{ fontSize: 13, opacity: 0.7 }}>{logoMessage}</span>}
            </div>
          )}
          <label style={{ display: "block", fontSize: 13, opacity: 0.7, marginBottom: 6 }}>{t("Visningsnavn")}</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("F.eks. Auto Collections")} style={{ ...inputStyle, marginBottom: 16 }} />
          <label style={{ display: "block", fontSize: 13, opacity: 0.7, marginBottom: 6 }}>{t("Kontakt-e-post")}</label>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder={t("post@butikken.no")} style={{ ...inputStyle, marginBottom: 16 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button onClick={saveStore} disabled={saving} style={{ padding: "10px 20px", borderRadius: 10, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              {saving ? t("Lagrer...") : t("Lagre")}
            </button>
            <Link href="/admin" style={{ ...linkButton, textDecoration: "none" }}>{t("Administrasjon")} →</Link>
            <button onClick={logout} style={linkButton}>{t("Logg ut som bedrift")}</button>
          </div>
          {message && <p style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>{message}</p>}
        </Panel>
      )}

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
