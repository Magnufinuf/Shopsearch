"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSession } from "@/lib/session-client";
import { ADVERT_CATEGORIES, Advert, advertCategory } from "@/lib/adverts";

export default function MineAnnonserPage() {
  const [domain, setDomain] = useState("");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession().then((s) => {
      if (s.shop) setDomain(s.shop);
      setSessionChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!domain) return;
    fetch("/api/adverts")
      .then((res) => res.json())
      .then((data) => {
        const mine = (data.adverts || []).filter((a: Advert) => a.store_domain === domain);
        setAdverts(mine);
        setLoading(false);
      });
  }, [domain]);

  async function handleDelete(id: string) {
    const confirmed = confirm("Slette denne annonsen?");
    if (!confirmed) return;

    await fetch("/api/adverts/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAdverts((prev) => prev.filter((a) => a.id !== id));
  }

  if (!sessionChecked) {
    return <p style={{ padding: 24, opacity: 0.6 }}>Laster...</p>;
  }

  if (!domain) {
    return (
      <main style={{ padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
        <p style={{ opacity: 0.75 }}>Du må <Link href="/logg-inn-bedrift" style={{ color: "var(--primary)" }}>logge inn som bedrift</Link> for å se dette.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
      <Link href="/admin" style={{ fontSize: 13, opacity: 0.6, display: "inline-block", marginBottom: 16 }}>
        ← Tilbake til administrasjon
      </Link>

      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 26, fontWeight: 600, marginBottom: 6 }}>
        Mine annonser
      </h1>
      <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 24 }}>{domain}</p>

      {loading && <p style={{ opacity: 0.6 }}>Laster annonser...</p>}
      {!loading && adverts.length === 0 && (
        <p style={{ opacity: 0.6 }}>Du har ikke lastet opp noen annonser ennå.</p>
      )}

      {!loading && adverts.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14 }}>
          {adverts.map((a) => (
            <div key={a.id} style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ aspectRatio: "9 / 14", backgroundColor: "black" }}>
                {a.media_type === "video" ? (
                  <video src={a.media_url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <img src={a.media_url} alt={a.caption} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
              <div style={{ padding: 10 }}>
                <p style={{ fontSize: 12, opacity: a.caption ? 0.75 : 0.45, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.caption || "Ingen tekst"}
                </p>
                <p style={{ fontSize: 11, opacity: 0.55, margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.product_url ? `${a.product_title || "Produkt"} · ${ADVERT_CATEGORIES.find((c) => c.slug === advertCategory(a))?.label || ""}` : "Hele butikken"}
                </p>
                <Link
                  href={`/admin/annonser/${a.id}`}
                  style={{ display: "block", textAlign: "center", padding: "6px 0", marginBottom: 6, borderRadius: 8, backgroundColor: "var(--primary)", color: "white", fontSize: 12, fontWeight: 600 }}
                >
                  Rediger
                </Link>
                <button
                  onClick={() => handleDelete(a.id)}
                  style={{ width: "100%", padding: "6px 0", borderRadius: 8, border: "1px solid #e05252", backgroundColor: "transparent", color: "#e05252", fontSize: 12, cursor: "pointer" }}
                >
                  Slett
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
