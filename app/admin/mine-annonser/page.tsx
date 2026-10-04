"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Advert = {
  id: string;
  store_domain: string;
  media_url: string;
  media_type: "video" | "image";
  caption: string;
  created_at: string;
};

export default function MineAnnonserPage() {
  const [domain, setDomain] = useState("");
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("shopsearch_business_domain");
    if (saved) setDomain(saved);
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
      body: JSON.stringify({ id, storeDomain: domain }),
    });
    setAdverts((prev) => prev.filter((a) => a.id !== id));
  }

  if (!domain) {
    return (
      <main style={{ padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
        <p style={{ opacity: 0.75 }}>Du må logge inn som bedrift for å se dette.</p>
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
                {a.caption && (
                  <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.caption}
                  </p>
                )}
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
