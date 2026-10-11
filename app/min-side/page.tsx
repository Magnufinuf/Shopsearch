"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Advert, shareAdvert, storeUrl } from "@/lib/adverts";
import { fetchUser, logoutUser, setSaved, UserInfo } from "@/lib/user-client";

const smallButton: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  fontSize: 13,
  cursor: "pointer",
};

export default function MinSide() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser().then((u) => {
      setUser(u);
      if (!u.loggedIn) {
        setLoading(false);
        return;
      }
      fetch("/api/user/saved")
        .then((res) => res.json())
        .then((data) => {
          setAdverts(data.adverts || []);
          setLoading(false);
        });
    });
  }, []);

  async function remove(advert: Advert) {
    setAdverts((prev) => prev.filter((a) => a.id !== advert.id));
    if (!(await setSaved(String(advert.id), false))) {
      setAdverts((prev) => [advert, ...prev]);
      alert("Noe gikk galt, prøv igjen.");
    }
  }

  async function deleteAccount() {
    if (!confirm("Slette kontoen din? Alle lagrede annonser forsvinner. Dette kan ikke angres.")) return;
    const res = await fetch("/api/user/delete", { method: "POST" });
    if (res.ok) window.location.assign("/");
    else alert("Noe gikk galt, prøv igjen.");
  }

  if (!user || (user.loggedIn && loading)) {
    return <p style={{ padding: 24, opacity: 0.6 }}>Laster...</p>;
  }

  if (!user.loggedIn) {
    return (
      <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div style={{ maxWidth: 360 }}>
          <p style={{ fontSize: 40, margin: "0 0 8px" }}>♡</p>
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 8px" }}>Lagre det du liker</h1>
          <p style={{ opacity: 0.7, marginBottom: 20 }}>Logg inn for å lagre annonser og finne dem igjen senere.</p>
          <Link href="/logg-inn" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 12, backgroundColor: "var(--primary)", color: "white", fontWeight: 600 }}>
            Logg inn
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: "48px 24px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 4px" }}>Min side</h1>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.6 }}>{user.email}</p>
        </div>
        <button onClick={logoutUser} style={smallButton}>Logg ut</button>
      </div>

      <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 12 }}>Lagrede annonser ({adverts.length})</h2>

      {adverts.length === 0 ? (
        <p style={{ opacity: 0.7 }}>
          Du har ikke lagret noe ennå. Trykk ♡ på en annonse under{" "}
          <Link href="/adverts" style={{ color: "var(--primary)" }}>Annonser</Link> for å lagre den her.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {adverts.map((a) => (
            <div key={a.id} style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <Link href={`/adverts?annonse=${a.id}`} style={{ display: "block", aspectRatio: "9 / 12", backgroundColor: "black" }}>
                {a.media_type === "video" ? (
                  <video src={a.media_url} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <img src={a.media_url} alt={a.caption} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </Link>
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{a.store_domain.replace(".myshopify.com", "")}</p>
                {a.caption && <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>{a.caption}</p>}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                  <a href={storeUrl(a.store_domain)} target="_blank" rel="noopener noreferrer" style={{ ...smallButton, backgroundColor: "var(--primary)", color: "white", border: "none" }}>
                    Kjøp
                  </a>
                  <button onClick={() => shareAdvert(a)} style={smallButton}>Del</button>
                  <button onClick={() => remove(a)} style={smallButton}>Fjern</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 56, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <button onClick={deleteAccount} style={{ ...smallButton, color: "#e05252", borderColor: "#e05252" }}>
          Slett kontoen min
        </button>
      </div>
    </main>
  );
}
