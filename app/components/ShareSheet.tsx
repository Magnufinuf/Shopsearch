"use client";

import { useEffect, useState } from "react";
import { Advert, advertShareUrl } from "@/lib/adverts";
import { fetchUser } from "@/lib/user-client";
import UsernameForm from "./UsernameForm";

type Contact = { value: string; label: string };

const AVATAR_COLORS = ["#C1502E", "#7C8B5F", "#3E6E8E", "#8E5E3E", "#6B4E8E", "#2E8C7A", "#B5803A"];

function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Person({ contact, selected, onClick }: { contact: Contact; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 72, flexShrink: 0, background: "none", border: "none", color: "var(--foreground)", cursor: "pointer", padding: 0 }}
    >
      <span style={{ position: "relative", width: 60, height: 60, borderRadius: 999, backgroundColor: avatarColor(contact.label), color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, outline: selected ? "3px solid var(--primary)" : "none", outlineOffset: 2 }}>
        {contact.label[0]?.toUpperCase()}
        {selected && (
          <span style={{ position: "absolute", right: -2, bottom: -2, width: 22, height: 22, borderRadius: 999, backgroundColor: "var(--primary)", border: "2px solid var(--background)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✓
          </span>
        )}
      </span>
      <span style={{ fontSize: 12, lineHeight: 1.25, textAlign: "center", wordBreak: "break-all", maxHeight: 30, overflow: "hidden" }}>{contact.label}</span>
    </button>
  );
}

function AppButton({ label, color, icon, onClick }: { label: string; color: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 72, flexShrink: 0, background: "none", border: "none", color: "var(--foreground)", cursor: "pointer", padding: 0 }}
    >
      <span style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>
        {icon}
      </span>
      <span style={{ fontSize: 12 }}>{label}</span>
    </button>
  );
}

const row: React.CSSProperties = { display: "flex", gap: 12, overflowX: "auto", padding: "4px 2px 8px", scrollbarWidth: "none" };

// «Del på»-vindu: send til venner i Scavenger øverst, del til andre apper under.
export default function ShareSheet({ advert, onClose }: { advert: Advert; onClose: () => void }) {
  const [user, setUser] = useState<{ loggedIn: boolean; username: string | null } | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact[]>([]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const url = advertShareUrl(advert.id);
  const text = advert.caption ? `${advert.caption} – se den på Scavenger` : "Se denne på Scavenger";

  useEffect(() => {
    fetchUser().then((u) => {
      setUser({ loggedIn: u.loggedIn, username: u.username ?? null });
      if (u.loggedIn) {
        fetch("/api/user/contacts")
          .then((res) => (res.ok ? res.json() : { contacts: [] }))
          .then((data) => setContacts(data.contacts || []));
      }
    });
  }, []);

  // Søk etter brukere mens man skriver.
  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(() => {
      if (q.includes("@")) {
        setResults(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q) ? [{ value: q.toLowerCase(), label: q.toLowerCase() }] : []);
        return;
      }
      if (q.length < 2) {
        setResults([]);
        return;
      }
      fetch(`/api/user/search?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : { users: [] }))
        .then((data) => setResults((data.users as string[]).map((u) => ({ value: u, label: u }))));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function toggle(contact: Contact) {
    setSelected((prev) =>
      prev.some((c) => c.value === contact.value) ? prev.filter((c) => c.value !== contact.value) : [...prev, contact]
    );
  }

  async function sendToSelected() {
    setStatus("sending");
    setError("");
    for (const contact of selected) {
      const res = await fetch("/api/user/send-advert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advertId: advert.id, to: contact.value, message }),
      });
      if (!res.ok) {
        const data = await res.json();
        setStatus("idle");
        setError(`${contact.label}: ${data.error || "Noe gikk galt."}`);
        return;
      }
    }
    setStatus("sent");
    setTimeout(onClose, 1400);
  }

  function openApp(href: string) {
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt("Kopier lenken:", url);
    }
  }

  const e = encodeURIComponent;
  const people = searchOpen && query.trim() ? results : contacts;
  const loginHref = `/logg-inn?neste=${e(`/adverts?annonse=${advert.id}`)}`;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-label="Del på"
        style={{ width: "100%", maxWidth: 520, backgroundColor: "var(--background)", color: "var(--foreground)", borderRadius: "20px 20px 0 0", padding: "16px 16px max(16px, env(safe-area-inset-bottom))", boxSizing: "border-box" }}
      >
        {/* Topp: søk – tittel – lukk */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          {searchOpen ? (
            <input
              autoFocus
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              placeholder="Søk etter brukernavn eller skriv e-post"
              autoCapitalize="none"
              autoCorrect="off"
              style={{ flex: 1, minWidth: 0, padding: "10px 14px", borderRadius: 999, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontSize: 16 }}
            />
          ) : (
            <>
              <button
                type="button"
                aria-label="Søk"
                onClick={() => (user?.loggedIn ? setSearchOpen(true) : window.location.assign(loginHref))}
                style={{ background: "none", border: "none", color: "var(--foreground)", cursor: "pointer", padding: 4 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </button>
              <h2 style={{ flex: 1, margin: 0, textAlign: "center", fontSize: 17, fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>Del på</h2>
            </>
          )}
          <button
            type="button"
            aria-label="Lukk"
            onClick={() => (searchOpen ? (setSearchOpen(false), setQuery("")) : onClose())}
            style={{ background: "none", border: "none", color: "var(--foreground)", fontSize: 26, lineHeight: 1, cursor: "pointer", padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* Venner i Scavenger */}
        {status === "sent" ? (
          <p style={{ textAlign: "center", fontSize: 17, fontWeight: 600, margin: "28px 0" }}>Sendt! ✉️</p>
        ) : user === null ? (
          <div style={{ height: 96 }} />
        ) : !user.loggedIn ? (
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <a href={loginHref} style={{ color: "var(--primary)", fontWeight: 600 }}>Logg inn</a>
            <span style={{ opacity: 0.7 }}> for å sende til venner i Scavenger</span>
          </div>
        ) : !user.username ? (
          <div style={{ paddingBottom: 12 }}>
            <p style={{ margin: "0 0 10px", fontSize: 14, opacity: 0.8 }}>Velg et brukernavn, så kan du sende til venner og de kan sende til deg.</p>
            <UsernameForm buttonLabel="Fortsett" onSaved={(username) => setUser({ ...user, username })} />
          </div>
        ) : people.length === 0 ? (
          <p style={{ textAlign: "center", fontSize: 14, opacity: 0.65, margin: "8px 0 18px" }}>
            {searchOpen && query.trim()
              ? "Fant ingen. Skriv brukernavnet eller e-posten deres."
              : "Trykk på 🔍 for å finne venner med brukernavnet deres."}
          </p>
        ) : (
          <div style={row}>
            {people.map((c) => (
              <Person key={c.value} contact={c} selected={selected.some((s) => s.value === c.value)} onClick={() => toggle(c)} />
            ))}
          </div>
        )}

        {/* Send til valgte */}
        {selected.length > 0 && status !== "sent" && (
          <div style={{ display: "flex", gap: 8, margin: "4px 0 12px" }}>
            <input
              value={message}
              onChange={(ev) => setMessage(ev.target.value)}
              placeholder="Skriv en hilsen..."
              maxLength={300}
              style={{ flex: 1, minWidth: 0, padding: "11px 14px", borderRadius: 12, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontSize: 16 }}
            />
            <button
              type="button"
              onClick={sendToSelected}
              disabled={status === "sending"}
              style={{ flexShrink: 0, padding: "0 18px", borderRadius: 12, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: status === "sending" ? 0.6 : 1 }}
            >
              {status === "sending" ? "..." : selected.length > 1 ? `Send (${selected.length})` : "Send"}
            </button>
          </div>
        )}
        {error && <p style={{ color: "#e05252", fontSize: 14, margin: "0 0 10px" }}>{error}</p>}

        <div style={{ height: 1, backgroundColor: "var(--border)", margin: "6px -16px 14px" }} />

        {/* Andre apper */}
        <div style={row}>
          <AppButton label={copied ? "Kopiert!" : "Kopier"} color="#3478F6" icon="🔗" onClick={copyLink} />
          <AppButton label="WhatsApp" color="#25D366" icon="W" onClick={() => openApp(`https://wa.me/?text=${e(`${text} ${url}`)}`)} />
          <AppButton label="Facebook" color="#1877F2" icon="f" onClick={() => openApp(`https://www.facebook.com/sharer/sharer.php?u=${e(url)}`)} />
          <AppButton label="Telegram" color="#29A9EB" icon="✈" onClick={() => openApp(`https://t.me/share/url?url=${e(url)}&text=${e(text)}`)} />
          <AppButton label="X" color="#000000" icon="𝕏" onClick={() => openApp(`https://x.com/intent/post?url=${e(url)}&text=${e(text)}`)} />
          <AppButton label="SMS" color="#34C759" icon="💬" onClick={() => window.location.assign(`sms:?&body=${e(`${text} ${url}`)}`)} />
          <AppButton label="E-post" color="#8E8E93" icon="✉" onClick={() => window.location.assign(`mailto:?subject=${e(text)}&body=${e(url)}`)} />
          {typeof navigator !== "undefined" && "share" in navigator && (
            <AppButton label="Mer" color="#636366" icon="•••" onClick={() => navigator.share({ title: text, url }).catch(() => {})} />
          )}
        </div>
      </div>
    </div>
  );
}
