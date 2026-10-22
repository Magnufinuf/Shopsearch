"use client";

import { useEffect, useState } from "react";

type Stats = {
  ready: boolean;
  last7: number;
  last30: number;
  total: number;
  daily: { date: string; clicks: number }[];
  topProducts: { productId: string; clicks: number }[];
  savedTotal?: number;
  topSaved?: { title: string; saves: number }[];
};

function TopList({ title, rows }: { title: string; rows: { key: string; label: string; value: number }[] }) {
  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>{title}</p>
      {rows.map((r) => (
        <div key={r.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderTop: "1px solid var(--border)", fontSize: 14 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
          <strong style={{ flexShrink: 0 }}>{r.value}</strong>
        </div>
      ))}
    </div>
  );
}

// "2026-10-13" -> "13. okt"
function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
      <p style={{ margin: "0 0 4px", fontSize: 13, opacity: 0.65 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{value.toLocaleString("nb-NO")}</p>
    </div>
  );
}

// Søylediagram: besøk per dag de siste 14 dagene. Én serie, så ingen fargeforklaring trengs.
function DailyBars({ daily }: { daily: Stats["daily"] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((d) => d.clicks));
  const shown = active ?? daily.length - 1;
  const height = 120;

  return (
    <div>
      {/* Verdien leder, datoen følger. Viser i dag til man peker på en annen dag. */}
      <p style={{ margin: "0 0 8px", fontSize: 13, minHeight: 20 }} aria-live="polite">
        <strong style={{ fontSize: 15 }}>{daily[shown]?.clicks ?? 0} besøk</strong>
        <span style={{ opacity: 0.6 }}> · {daily[shown] ? shortDate(daily[shown].date) : ""}</span>
      </p>
      <div
        style={{ display: "flex", alignItems: "flex-end", gap: 2, height, borderBottom: "1px solid var(--border)" }}
        onPointerLeave={() => setActive(null)}
      >
        {daily.map((d, i) => (
          <button
            key={d.date}
            type="button"
            aria-label={`${shortDate(d.date)}: ${d.clicks} besøk`}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            // Hele kolonnen er treffområdet, ikke bare den fargede søylen.
            style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", background: "none", border: "none", padding: 0, cursor: "default" }}
          >
            <span
              style={{
                display: "block",
                width: "100%",
                height: d.clicks === 0 ? 2 : Math.max(4, (d.clicks / max) * height),
                borderRadius: d.clicks === 0 ? 0 : "4px 4px 0 0",
                backgroundColor: d.clicks === 0 ? "var(--border)" : "var(--primary)",
                opacity: active === null || active === i ? 1 : 0.55,
                transition: "opacity 0.1s ease",
              }}
            />
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.55, marginTop: 6 }}>
        <span>{daily[0] ? shortDate(daily[0].date) : ""}</span>
        <span>I dag</span>
      </div>
      {/* Samme tall som tabell for skjermlesere. */}
      <table style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        <caption>Besøk per dag</caption>
        <tbody>
          {daily.map((d) => (
            <tr key={d.date}>
              <th>{shortDate(d.date)}</th>
              <td>{d.clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Besøk Scavenger har sendt butikken (klikk på produkter og «Kjøp» på annonser).
export default function StatsPanel({ productTitles }: { productTitles: Record<string, string> }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <section style={{ border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px", marginBottom: 24 }}>
      <h2 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>
        Besøk fra Scavenger
      </h2>
      <p style={{ margin: "0 0 16px", fontSize: 13, opacity: 0.6 }}>Hvor mange som har gått til butikken din via Scavenger.</p>

      {stats === null ? (
        <p style={{ opacity: 0.6, margin: 0 }}>Laster...</p>
      ) : !stats.ready ? (
        <p style={{ opacity: 0.6, margin: 0 }}>Statistikken kommer snart.</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
            <Tile label="Siste 7 dager" value={stats.last7} />
            <Tile label="Siste 30 dager" value={stats.last30} />
            <Tile label="Totalt" value={stats.total} />
            <Tile label="Lagringer" value={stats.savedTotal ?? 0} />
          </div>

          <DailyBars daily={stats.daily} />

          {stats.topProducts.length > 0 && (
            <TopList
              title="Mest besøkte produkter (30 dager)"
              rows={stats.topProducts.map((t) => ({ key: t.productId, label: productTitles[t.productId] ?? "Produkt", value: t.clicks }))}
            />
          )}

          {!!stats.topSaved?.length && (
            <TopList
              title="Mest lagrede produkter"
              rows={stats.topSaved.map((t, i) => ({ key: `${i}-${t.title}`, label: t.title, value: t.saves }))}
            />
          )}

          {stats.total === 0 && (
            <p style={{ margin: "16px 0 0", fontSize: 13, opacity: 0.65 }}>
              Ingen besøk ennå. Tips: last opp en annonse, så blir produktene dine lettere å oppdage.
            </p>
          )}
        </>
      )}
    </section>
  );
}
