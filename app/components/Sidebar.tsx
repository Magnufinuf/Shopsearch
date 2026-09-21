"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Søk" },
  { href: "/reels", label: "Reels" },
  { href: "/innstillinger", label: "Innstillinger" },
];

export default function Sidebar() {
  const [businessDomain, setBusinessDomain] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("shopsearch_business_domain");
    setBusinessDomain(saved);
  }, []);

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
          fontFamily: "var(--font-heading), Georgia, serif",
          fontSize: 22,
          fontWeight: 600,
          marginBottom: 24,
          color: "var(--primary)",
        }}
      >
        Scavenger
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
          </Link>
        );
      })}

      <div style={{ marginTop: "auto", paddingTop: 24 }}>
        {businessDomain ? (
          <span style={{ fontSize: 12, opacity: 0.6 }}>
            Innlogget som: {businessDomain}
          </span>
        ) : (
          <Link
            href="/logg-inn-bedrift"
            style={{
              fontSize: 14,
              color: "var(--primary)",
              fontWeight: 500,
            }}
          >
            Logg inn som bedrift
          </Link>
        )}
      </div>
    </nav>
  );
}
