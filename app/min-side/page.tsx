"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Advert, advertStoreName, storeUrl } from "@/lib/adverts";
import { trackClick } from "@/lib/track";
import { fetchUser, logoutUser, setSaved, UserInfo } from "@/lib/user-client";
import ShareSheet from "../components/ShareSheet";
import UsernameForm from "../components/UsernameForm";

type InboxItem = {
  id: string;
  message: string | null;
  seen: boolean;
  createdAt: string;
  from: string | null;
  advert: Advert;
};

const smallButton: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  fontSize: 13,
  cursor: "pointer",
};

const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 };

function AdvertCard({
  advert: a,
  header,
  onShare,
  children,
}: {
  advert: Advert;
  header?: React.ReactNode;
  onShare: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {header && <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>{header}</div>}
      <Link href={`/adverts?annonse=${a.id}`} style={{ display: "block", aspectRatio: "9 / 12", backgroundColor: "black" }}>
        {a.media_type === "video" ? (
          <video src={a.media_url} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <img src={a.media_url} alt={a.caption} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </Link>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{advertStoreName(a)}</p>
        {a.caption && <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>{a.caption}</p>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
          <a href={storeUrl(a.store_domain)} onClick={() => trackClick(a.store_domain, "lagret")} target="_blank" rel="noopener noreferrer" style={{ ...smallButton, backgroundColor: "var(--primary)", color: "white", border: "none" }}>
            Kjøp
          </a>
          <button onClick={onShare} style={smallButton}>Del</button>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function MinSide() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [tab, setTab] = useState<"mottatt" | "lagret">("lagret");
  const [sharing, setSharing] = useState<Advert | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);

  useEffect(() => {
    fetchUser().then((u) => {
      setUser(u);
      if (!u.loggedIn) {
        setLoading(false);
        return;
      }
      if (u.unread > 0) setTab("mottatt");
      Promise.all([
        fetch("/api/user/saved").then((res) => res.json()),
        fetch("/api/user/inbox").then((res) => (res.ok ? res.json() : { items: [] })),
      ]).then(([saved, received]) => {
        setAdverts(saved.adverts || []);
        setInbox(received.items || []);
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

  // Når innboksen vises, regnes alt som lest.
  useEffect(() => {
    if (tab === "mottatt" && inbox.some((i) => !i.seen)) {
      fetch("/api/user/inbox", { method: "POST" });
    }
  }, [tab, inbox]);

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
          <p style={{ margin: 0, fontSize: 14 }}>
            {user.username ? <strong>{user.username}</strong> : <span style={{ opacity: 0.6 }}>Ingen brukernavn ennå</span>}
            {!editingUsername && (
              <button onClick={() => setEditingUsername(true)} style={{ marginLeft: 8, background: "none", border: "none", color: "var(--primary)", fontSize: 13, cursor: "pointer", padding: 0 }}>
                {user.username ? "Endre" : "Velg brukernavn"}
              </button>
            )}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.6 }}>{user.email}</p>
        </div>
        <button onClick={logoutUser} style={smallButton}>Logg ut</button>
      </div>

      {editingUsername && (
        <div style={{ maxWidth: 420, marginBottom: 24 }}>
          <UsernameForm
            initial={user.username || ""}
            onSaved={(username) => {
              setUser({ ...user, username });
              setEditingUsername(false);
            }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(
          [
            ["lagret", `Lagret (${adverts.length})`, 0],
            ["mottatt", `Mottatt (${inbox.length})`, inbox.filter((i) => !i.seen).length],
          ] as const
        ).map(([key, label, badge]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              backgroundColor: tab === key ? "var(--primary)" : "transparent",
              color: tab === key ? "white" : "var(--foreground)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {label}
            {badge > 0 && (
              <span style={{ backgroundColor: "#e05252", color: "white", borderRadius: 999, fontSize: 11, padding: "1px 7px" }}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "lagret" &&
        (adverts.length === 0 ? (
          <p style={{ opacity: 0.7 }}>
            Du har ikke lagret noe ennå. Trykk ♡ på en annonse under{" "}
            <Link href="/adverts" style={{ color: "var(--primary)" }}>Annonser</Link> for å lagre den her.
          </p>
        ) : (
          <div style={grid}>
            {adverts.map((a) => (
              <AdvertCard key={a.id} advert={a} onShare={() => setSharing(a)}>
                <button onClick={() => remove(a)} style={smallButton}>Fjern</button>
              </AdvertCard>
            ))}
          </div>
        ))}

      {tab === "mottatt" &&
        (inbox.length === 0 ? (
          <p style={{ opacity: 0.7 }}>
            Ingen har sendt deg noe ennå. Når noen sender deg en annonse, dukker den opp her.
          </p>
        ) : (
          <div style={grid}>
            {inbox.map((item) => (
              <AdvertCard
                key={item.id}
                advert={item.advert}
                onShare={() => setSharing(item.advert)}
                header={
                  <div style={{ fontSize: 12 }}>
                    <span style={{ opacity: 0.6 }}>Fra </span>
                    <strong style={{ wordBreak: "break-all" }}>{item.from || "en venn"}</strong>
                    {!item.seen && <span style={{ marginLeft: 6, color: "#e05252", fontWeight: 600 }}>Ny</span>}
                    {item.message && <p style={{ margin: "6px 0 0", fontStyle: "italic", opacity: 0.85 }}>«{item.message}»</p>}
                  </div>
                }
              />
            ))}
          </div>
        ))}

      {sharing && <ShareSheet advert={sharing} onClose={() => setSharing(null)} />}

      <div style={{ marginTop: 56, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <button onClick={deleteAccount} style={{ ...smallButton, color: "#e05252", borderColor: "#e05252" }}>
          Slett kontoen min
        </button>
      </div>
    </main>
  );
}
