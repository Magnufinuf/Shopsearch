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
        width: 200,
        minHeight: "100vh",
        borderRight: "1px solid #ddd",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <Link href="/">Søk</Link>
      <Link href="/reels">Reels</Link>
      <Link href="/innstillinger">Innstillinger</Link>

      {businessDomain && <Link href="/admin">Administrasjon</Link>}

      <div style={{ marginTop: "auto" }}>
        {businessDomain ? (
          <span style={{ fontSize: 12, color: "#666" }}>
            Innlogget som: {businessDomain}
          </span>
        ) : (
          <Link href="/logg-inn-bedrift">Logg inn som bedrift</Link>
        )}
      </div>
    </nav>
  );
}
