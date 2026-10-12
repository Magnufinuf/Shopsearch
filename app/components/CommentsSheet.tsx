"use client";

import { useEffect, useRef, useState } from "react";
import { fetchUser } from "@/lib/user-client";
import UsernameForm from "./UsernameForm";

type Comment = { id: string; text: string; createdAt: string; username: string; canDelete: boolean };

const AVATAR_COLORS = ["#C1502E", "#7C8B5F", "#3E6E8E", "#8E5E3E", "#6B4E8E", "#2E8C7A", "#B5803A"];
function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// "nå", "5 min", "3 t", "2 d", ellers dato.
function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "nå";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} t`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

// Kommentarer på en annonse, som et vindu nedenfra (som på TikTok).
export default function CommentsSheet({
  advertId,
  onClose,
  onCountChange,
}: {
  advertId: string;
  onClose: () => void;
  onCountChange: (count: number) => void;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [user, setUser] = useState<{ loggedIn: boolean; username: string | null } | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/adverts/${advertId}/comments`)
      .then((res) => (res.ok ? res.json() : { comments: [] }))
      .then((data) => setComments(data.comments || []));
    fetchUser().then((u) => setUser({ loggedIn: u.loggedIn, username: u.username ?? null }));
  }, [advertId]);

  // Scroll til bunnen når nye kommentarer kommer.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [comments]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/adverts/${advertId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      if (data.needsUsername && user) setUser({ ...user, username: null });
      setError(data.error || "Noe gikk galt, prøv igjen.");
      return;
    }
    const next = [...(comments || []), data.comment as Comment];
    setComments(next);
    onCountChange(next.length);
    setText("");
  }

  async function remove(comment: Comment) {
    if (!confirm("Slette kommentaren?")) return;
    const res = await fetch(`/api/adverts/${advertId}/comments?kommentar=${comment.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Noe gikk galt, prøv igjen.");
      return;
    }
    const next = (comments || []).filter((c) => c.id !== comment.id);
    setComments(next);
    onCountChange(next.length);
  }

  const loginHref = `/logg-inn?neste=${encodeURIComponent(`/adverts?annonse=${advertId}`)}`;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-label="Kommentarer"
        style={{ width: "100%", maxWidth: 520, height: "70dvh", display: "flex", flexDirection: "column", backgroundColor: "var(--background)", color: "var(--foreground)", borderRadius: "20px 20px 0 0", boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ width: 32 }} />
          <h2 style={{ flex: 1, margin: 0, textAlign: "center", fontSize: 16, fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>
            {comments ? `${comments.length} kommentar${comments.length === 1 ? "" : "er"}` : "Kommentarer"}
          </h2>
          <button onClick={onClose} aria-label="Lukk" style={{ width: 32, background: "none", border: "none", color: "var(--foreground)", fontSize: 26, lineHeight: 1, cursor: "pointer" }}>
            ×
          </button>
        </div>

        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
          {comments === null ? (
            <p style={{ opacity: 0.6, textAlign: "center", marginTop: 32 }}>Laster...</p>
          ) : comments.length === 0 ? (
            <p style={{ opacity: 0.6, textAlign: "center", marginTop: 32 }}>Ingen kommentarer ennå. Bli den første!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 10, padding: "10px 0" }}>
                <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 999, backgroundColor: avatarColor(c.username), color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14 }}>
                  {c.username[0]?.toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, opacity: 0.6 }}>
                    <strong style={{ opacity: 1 }}>{c.username}</strong> · {timeAgo(c.createdAt)}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 15, lineHeight: 1.4, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{c.text}</p>
                </div>
                {c.canDelete && (
                  <button onClick={() => remove(c)} aria-label="Slett kommentar" style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--foreground)", opacity: 0.4, cursor: "pointer", fontSize: 13 }}>
                    Slett
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px max(12px, env(safe-area-inset-bottom))" }}>
          {user === null ? null : !user.loggedIn ? (
            <p style={{ margin: 0, textAlign: "center" }}>
              <a href={loginHref} style={{ color: "var(--primary)", fontWeight: 600 }}>Logg inn</a>
              <span style={{ opacity: 0.7 }}> for å kommentere</span>
            </p>
          ) : !user.username ? (
            <>
              <p style={{ margin: "0 0 8px", fontSize: 14, opacity: 0.8 }}>Velg et brukernavn for å kommentere.</p>
              <UsernameForm buttonLabel="Fortsett" onSaved={(username) => { setUser({ ...user, username }); setError(""); }} />
            </>
          ) : (
            <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Legg til en kommentar..."
                maxLength={300}
                style={{ flex: 1, minWidth: 0, padding: "11px 14px", borderRadius: 999, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontSize: 16 }}
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                style={{ flexShrink: 0, padding: "0 18px", borderRadius: 999, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: !text.trim() || sending ? 0.5 : 1 }}
              >
                {sending ? "..." : "Send"}
              </button>
            </form>
          )}
          {error && <p style={{ color: "#e05252", fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
