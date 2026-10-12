"use client";

import { useEffect, useState } from "react";
import { Advert, advertShareUrl } from "@/lib/adverts";
import { fetchUser } from "@/lib/user-client";

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
  // color kan være en farge eller en gradient.
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 72, flexShrink: 0, background: "none", border: "none", color: "var(--foreground)", cursor: "pointer", padding: 0 }}
    >
      <span style={{ width: 56, height: 56, borderRadius: 999, background: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>
        {icon}
      </span>
      <span style={{ fontSize: 12 }}>{label}</span>
    </button>
  );
}

// Enkle ikoner for delingsknappene (tegnet selv, ikke offisielle logoer).
const svg = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const ICONS = {
  snapchat: (
    <svg {...svg} stroke="black" strokeWidth={1.6} fill="white">
      <path d="M12 3c3 0 5 2.2 5 5.2v2.3l1.6-.6c.6-.2 1 .5.5.9l-1.8 1.2c.6 1.6 1.9 2.8 3.4 3.2-.3.8-1.6 1-2.6 1.2-.2.6-.3 1.2-.6 1.2-.6 0-1.4-.3-2.4 0-1.2.4-1.8 1.4-3.1 1.4s-1.9-1-3.1-1.4c-1-.3-1.8 0-2.4 0-.3 0-.4-.6-.6-1.2-1-.2-2.3-.4-2.6-1.2 1.5-.4 2.8-1.6 3.4-3.2L4.9 10.8c-.5-.4-.1-1.1.5-.9l1.6.6V8.2C7 5.2 9 3 12 3Z" />
    </svg>
  ),
  instagram: (
    <svg {...svg}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="white" />
    </svg>
  ),
  messages: (
    <svg {...svg} fill="white" stroke="none">
      <path d="M12 3.5c-5 0-9 3.3-9 7.4 0 2.3 1.3 4.4 3.3 5.8-.2 1.4-.9 2.6-1.9 3.6 2 0 3.7-.8 4.9-1.9.9.2 1.8.3 2.7.3 5 0 9-3.3 9-7.4S17 3.5 12 3.5Z" />
    </svg>
  ),
  messenger: (
    <svg {...svg} fill="white" stroke="none">
      <path d="M12 2.5C6.6 2.5 2.5 6.5 2.5 11.6c0 2.7 1.1 5 3 6.6v3.3l3-1.7c1.1.3 2.2.5 3.5.5 5.4 0 9.5-4 9.5-9.1S17.4 2.5 12 2.5Zm1 12.1-2.4-2.6-4.7 2.6 5.2-5.5 2.5 2.6 4.6-2.6-5.2 5.5Z" />
    </svg>
  ),
  whatsapp: (
    <svg {...svg}>
      <path d="M3.5 20.5 5 16.3A8.5 8.5 0 1 1 8 19.2l-4.5 1.3Z" />
      <path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 1c-1.2-.5-2.4-1.7-2.9-2.9l1-1-1-2L9 8.5Z" fill="white" stroke="none" />
    </svg>
  ),
  facebook: (
    <svg {...svg} fill="white" stroke="none">
      <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.7c0-.9.3-1.5 1.5-1.5h1.5V4.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.4-3.8 3.9v2.2H8v3h2.5V21h3Z" />
    </svg>
  ),
  chatgpt: (
    <svg {...svg} strokeWidth={1.7}>
      <path d="M12 3.2a4.3 4.3 0 0 1 4.2 3.4 4.3 4.3 0 0 1 3 6.5 4.3 4.3 0 0 1-4.1 7.1 4.3 4.3 0 0 1-7.2-.6 4.3 4.3 0 0 1-3-6.5 4.3 4.3 0 0 1 4.1-7.1A4.3 4.3 0 0 1 12 3.2Z" />
      <path d="M9 9.5 12 7.8l3 1.7v3.5l-3 1.7-3-1.7Z" />
    </svg>
  ),
  copy: (
    <svg {...svg}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  ),
  more: (
    <svg {...svg} fill="white" stroke="none">
      <circle cx="6" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="18" cy="12" r="1.8" />
    </svg>
  ),
};

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
  const [notice, setNotice] = useState("");

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

  function flash(textToShow: string) {
    setNotice(textToShow);
    setTimeout(() => setNotice(""), 2500);
  }

  async function copyLink(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      prompt("Kopier lenken:", url);
      return false;
    }
  }

  const isPhone = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  // Instagram, TikTok o.l. har ingen «del lenke»-adresse. På mobil åpner vi telefonens delingsmeny
  // (der appen ligger), ellers kopierer vi lenken og åpner appen så man kan lime den inn.
  async function shareViaApp(appName: string, fallbackUrl: string) {
    if (isPhone && canNativeShare) {
      navigator.share({ title: text, url }).catch(() => {});
      return;
    }
    if (await copyLink()) flash(`Lenken er kopiert – lim den inn i ${appName}`);
    openApp(fallbackUrl);
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

        {notice && (
          <p style={{ textAlign: "center", fontSize: 13, fontWeight: 600, margin: "0 0 10px", color: "var(--primary)" }}>{notice}</p>
        )}

        {/* Andre apper */}
        <div style={row}>
          <AppButton
            label="Snapchat"
            color="#FFFC00"
            icon={ICONS.snapchat}
            onClick={() => openApp(`https://www.snapchat.com/scan?attachmentUrl=${e(url)}`)}
          />
          <AppButton
            label="Instagram"
            color="linear-gradient(45deg, #FEDA75, #FA7E1E 25%, #D62976 50%, #962FBF 75%, #4F5BD5)"
            icon={ICONS.instagram}
            onClick={() => shareViaApp("Instagram", "https://www.instagram.com/direct/inbox/")}
          />
          <AppButton
            label="Meldinger"
            color="#34C759"
            icon={ICONS.messages}
            onClick={() => window.location.assign(`sms:?&body=${e(`${text} ${url}`)}`)}
          />
          <AppButton
            label="Messenger"
            color="linear-gradient(45deg, #0099FF, #A033FF 60%, #FF5280 90%)"
            icon={ICONS.messenger}
            onClick={() =>
              isPhone
                ? window.location.assign(`fb-messenger://share/?link=${e(url)}`)
                : shareViaApp("Messenger", "https://www.messenger.com/")
            }
          />
          <AppButton label="WhatsApp" color="#25D366" icon={ICONS.whatsapp} onClick={() => openApp(`https://wa.me/?text=${e(`${text} ${url}`)}`)} />
          <AppButton
            label="ChatGPT"
            color="#10A37F"
            icon={ICONS.chatgpt}
            onClick={() => openApp(`https://chatgpt.com/?q=${e(`Hva synes du om dette produktet? ${url}`)}`)}
          />
          <AppButton label="Facebook" color="#1877F2" icon={ICONS.facebook} onClick={() => openApp(`https://www.facebook.com/sharer/sharer.php?u=${e(url)}`)} />
          <AppButton
            label="Kopier"
            color="#3478F6"
            icon={ICONS.copy}
            onClick={async () => {
              if (await copyLink()) flash("Lenken er kopiert!");
            }}
          />
          {canNativeShare && (
            <AppButton label="Mer" color="#636366" icon={ICONS.more} onClick={() => navigator.share({ title: text, url }).catch(() => {})} />
          )}
        </div>
      </div>
    </div>
  );
}
