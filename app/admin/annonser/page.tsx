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

  async function changeCategory(id: string, category: string) {
    const before = adverts;
    setAdverts((prev) => prev.map((a) => (a.id === id ? { ...a, category } : a)));
    const res = await fetch("/api/adverts/category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, category }),
    });
    if (!res.ok) {
      setAdverts(before);
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Noe gikk galt, prøv igjen.");
    }
  }

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
                {a.caption && (
                  <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.caption}
                  </p>
                )}
                <select
                  value={advertCategory(a)}
                  onChange={(e) => changeCategory(a.id, e.target.value)}
                  aria-label="Kategori"
                  style={{ width: "100%", padding: "6px 4px", marginBottom: 8, borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: 12 }}
                >
                  {ADVERT_CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>
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
