"use client";

import { useState } from "react";
import { Platform, searchPlatforms } from "@/lib/platforms";

// «Finner du ikke plattformen din?»: søk blant alle nettbutikkplattformer.
export default function PlatformSearch({ onPick }: { onPick: (platform: Platform) => void }) {
  const [query, setQuery] = useState("");
  const results = searchPlatforms(query);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
      <label style={{ fontSize: 13, opacity: 0.7 }}>Finner du ikke nettbutikkplattformen din? Søk her</label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="F.eks. Mystore, Centra, Magento"
        style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontSize: 15, boxSizing: "border-box" }}
      />
      {query.trim() && (
        <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {results.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                onPick(p);
                setQuery("");
              }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", background: "none", border: "none", borderBottom: "1px solid var(--border)", color: "var(--foreground)", fontSize: 15, cursor: "pointer", textAlign: "left" }}
            >
              <span>{p.name}</span>
              <span style={{ fontSize: 12, opacity: 0.55 }}>{p.kind === "feed" ? "Koble til med feed" : "Egen tilkobling"}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onPick({ name: query.trim(), kind: "feed" });
              setQuery("");
            }}
            style={{ padding: "11px 14px", background: "none", border: "none", color: "var(--primary)", fontSize: 14, cursor: "pointer", textAlign: "left" }}
          >
            {results.length ? "Ikke på lista? " : ""}Koble til «{query.trim()}» med produktfeed →
          </button>
        </div>
      )}
    </div>
  );
}
