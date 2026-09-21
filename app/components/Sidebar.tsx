"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const [businessDomain, setBusinessDomain] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("shopsearch_business_domain");
    setBusinessDomain(saved);
  }, []);

  return (
    <nav
      style={{
        width: 220,
        minHeight: "100vh",
        borderRight: "1px solid var(--border)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 12,
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

      <Link href="/">Søk</Link>
      <Link href="/reels">Reels</Link>
      <Link href="/innstillinger">Innstillinger</Link>

      {businessDomain && <Link href="/admin">Administrasjon</Link>}

      <div style={{ marginTop: "auto" }}>
        {businessDomain ? (
          <span style={{ fontSize: 12, opacity: 0.6 }}>
            Innlogget som: {businessDomain}
          </span>
        ) : (
          <Link href="/logg-inn-bedrift">Logg inn som bedrift</Link>
        )}
      </div>
    </nav>
  );
}
