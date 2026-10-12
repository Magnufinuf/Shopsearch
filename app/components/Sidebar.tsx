"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchSession, logout } from "@/lib/session-client";
import { rememberAccount } from "@/lib/remembered-accounts";
import { fetchUser } from "@/lib/user-client";

const navItems = [
  { href: "/", label: "Søk" },
  { href: "/adverts", label: "Annonser" },
  { href: "/min-side", label: "Min side" },
  { href: "/innstillinger", label: "Innstillinger" },
];

export default function Sidebar() {
  const [businessDomain, setBusinessDomain] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    // Gammel innlogging (før cookies) ryddes bort.
    localStorage.removeItem("shopsearch_business_domain");
    fetchSession().then((s) => {
      setBusinessDomain(s.shop);
      if (s.shop) rememberAccount({ shop: s.shop, name: s.displayName || s.shop.replace(".myshopify.com", "") });
    });
    fetchUser().then((u) => {
      setUserEmail(u.email);
      setUnread(u.unread);
    });
  }, [pathname]);

  const items = businessDomain
    ? [...navItems, { href: "/admin", label: "Administrasjon" }]
    : navItems;

  return (
    <nav
      style={{
        width: 220,
        minHeight: "100vh",
        borderRight: "1px solid var(--border)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <img
          src="/logo.png"
          alt="Scavenger"
          style={{ width: 32, height: 32, objectFit: "contain" }}
        />
        <span
          style={{
            fontFamily: "var(--font-heading), Georgia, serif",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--primary)",
          }}
        >
          Scavenger
        </span>
      </div>

      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
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
            {item.label}
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
          <Link href="/personvern">Personvern</Link>
          <Link href="/vilkar">Vilkår</Link>
        </div>
        {businessDomain ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              Innlogget som: {businessDomain}
            </span>
            <button
              onClick={logout}
              style={{ alignSelf: "flex-start", padding: 0, border: "none", background: "none", color: "var(--primary)", fontSize: 13, cursor: "pointer" }}
            >
              Logg ut
            </button>
          </div>
        ) : userEmail ? (
          <span style={{ fontSize: 12, opacity: 0.6, wordBreak: "break-all" }}>
            Innlogget som: {userEmail}
          </span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/logg-inn" style={{ fontSize: 14, color: "var(--primary)", fontWeight: 600 }}>
              Logg inn
            </Link>
            <Link href="/logg-inn-bedrift" style={{ fontSize: 12, opacity: 0.6 }}>
              Logg inn som bedrift
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
