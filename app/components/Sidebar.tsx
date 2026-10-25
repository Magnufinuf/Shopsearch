"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchSession, logout } from "@/lib/session-client";
import { rememberAccount } from "@/lib/remembered-accounts";
import { fetchUser } from "@/lib/user-client";
import { useT } from "@/lib/i18n";

const navItems = [
  { href: "/", label: "Søk" },
  { href: "/outfit", label: "AI-outfit" },
  { href: "/swipe", label: "Swipe" },
  { href: "/adverts", label: "Annonser" },
  { href: "/min-side", label: "Min side" },
  { href: "/innstillinger", label: "Innstillinger" },
];

export default function Sidebar() {
  const t = useT();
  const [businessDomain, setBusinessDomain] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  // Mobil: menyen er skjult bak ☰-knappen og glir inn fra venstre.
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Gammel innlogging (før cookies) ryddes bort.
    localStorage.removeItem("shopsearch_business_domain");
    fetchSession().then((s) => {
      setBusinessDomain(s.shop);
      setBusinessName(s.displayName || s.shop?.replace(".myshopify.com", "") || null);
      if (s.shop) rememberAccount({ shop: s.shop, name: s.displayName || s.shop.replace(".myshopify.com", "") });
      // Butikker må velge navn og logo før de bruker Scavenger.
      if (s.shop && (!s.displayName || (s.logoSupported && !s.logoUrl)) && pathname !== "/bedrift-navn") {
        window.location.assign(`/bedrift-navn?neste=${encodeURIComponent(pathname)}`);
      }
    });
    fetchUser().then((u) => {
      setUserEmail(u.username || u.email);
      setUnread(u.unread);
      // Innlogget uten brukernavn (laget konto før brukernavn fantes): be om det først.
      if (u.loggedIn && !u.username && pathname !== "/logg-inn") {
        window.location.assign(`/logg-inn?neste=${encodeURIComponent(pathname)}`);
      }
    });
  }, [pathname]);

  const items = businessDomain
    ? [...navItems, { href: "/admin", label: "Administrasjon" }]
    : navItems;

  const close = () => setOpen(false);

  const logo = (
    <Link href="/" onClick={close} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img src="/logo.png" alt="Scavenger" style={{ width: 32, height: 32, objectFit: "contain" }} />
      <span style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 22, fontWeight: 600, color: "var(--primary)" }}>
        Scavenger
      </span>
    </Link>
  );

  return (
    <>
    {/* Toppstripe – vises bare på mobil */}
    <header className="sc-topbar">
      {logo}
      <button
        onClick={() => setOpen(true)}
        aria-label={t("Åpne meny")}
        style={{ position: "relative", background: "none", border: "none", color: "var(--foreground)", padding: 8, cursor: "pointer" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        {unread > 0 && (
          <span style={{ position: "absolute", top: 4, right: 4, width: 10, height: 10, borderRadius: 999, backgroundColor: "#e05252" }} />
        )}
      </button>
    </header>

    <div className={`sc-backdrop${open ? " open" : ""}`} onClick={close} />

    <nav className={`sc-sidebar${open ? " open" : ""}`}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        {logo}
        <button className="sc-close" onClick={close} aria-label={t("Lukk meny")} style={{ background: "none", border: "none", color: "var(--foreground)", fontSize: 26, lineHeight: 1, cursor: "pointer", padding: 4 }}>
          ×
        </button>
      </div>

      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: active ? 600 : 400,
              color: active ? "var(--primary)" : "var(--foreground)",
              backgroundColor: active ? "var(--border)" : "transparent",
              opacity: active ? 1 : 0.85,
              transition: "background-color 0.15s ease",
            }}
          >
            {t(item.label)}
            {item.href === "/min-side" && unread > 0 && (
              <span style={{ marginLeft: 8, backgroundColor: "#e05252", color: "white", borderRadius: 999, fontSize: 11, padding: "1px 7px", fontWeight: 600 }}>
                {unread}
              </span>
            )}
          </Link>
        );
      })}

      <div style={{ marginTop: "auto", paddingTop: 24 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 12, opacity: 0.55, marginBottom: 12 }}>
          <Link href="/personvern" onClick={close}>{t("Personvern")}</Link>
          <Link href="/vilkar" onClick={close}>{t("Vilkår")}</Link>
        </div>
        {businessDomain ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              {t("Innlogget som: {navn}", { navn: businessName || businessDomain })}
            </span>
            <button
              onClick={logout}
              style={{ alignSelf: "flex-start", padding: 0, border: "none", background: "none", color: "var(--primary)", fontSize: 13, cursor: "pointer" }}
            >
              {t("Logg ut")}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {userEmail ? (
              <span style={{ fontSize: 12, opacity: 0.6, wordBreak: "break-all" }}>
                {t("Innlogget som: {navn}", { navn: userEmail })}
              </span>
            ) : (
              <Link href="/logg-inn" onClick={close} style={{ fontSize: 14, color: "var(--primary)", fontWeight: 600 }}>
                {t("Logg inn")}
              </Link>
            )}
            {/* Synlig for butikkeiere, men roligere enn vanlig innlogging. */}
            <Link
              href="/logg-inn-bedrift"
              onClick={close}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.7 }}>
                <path d="M4 9.5 5.5 4h13L20 9.5" />
                <path d="M4 9.5c0 1.4 1.1 2.5 2.7 2.5s2.6-1.1 2.6-2.5c0 1.4 1.1 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1 2.5 2.6 2.5S20 10.9 20 9.5" />
                <path d="M5.5 12v8h13v-8M10 20v-4.5h4V20" />
              </svg>
              {t("Logg inn som bedrift")}
            </Link>
          </div>
        )}
      </div>
    </nav>
    </>
  );
}
