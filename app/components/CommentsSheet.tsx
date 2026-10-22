"use client";

import { useEffect, useRef, useState } from "react";
import { fetchUser } from "@/lib/user-client";
import { CloseIcon } from "./Icons";
import { Lang, locale, useLang, useT } from "@/lib/i18n";

type Translate = (text: string, vars?: Record<string, string | number>) => string;

type Comment = { id: string; text: string; createdAt: string; username: string; canDelete: boolean };

const AVATAR_COLORS = ["#C1502E", "#7C8B5F", "#3E6E8E", "#8E5E3E", "#6B4E8E", "#2E8C7A", "#B5803A"];
function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// Viser @brukernavn uthevet i kommentarteksten.
function CommentText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(@[a-z0-9._]{3,20})/gi).map((part, i) =>
        part.startsWith("@") ? (
          <strong key={i} style={{ color: "var(--primary)" }}>{part}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// "nå", "5 min", "3 t", "2 d", ellers dato.
function timeAgo(iso: string, t: Translate, lang: Lang): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return t("nå");
  if (s < 3600) return t("{n} min", { n: Math.floor(s / 60) });
  if (s < 86400) return t("{n} t", { n: Math.floor(s / 3600) });
  if (s < 7 * 86400) return t("{n} d", { n: Math.floor(s / 86400) });
  return new Date(iso).toLocaleDateString(locale(lang), { day: "numeric", month: "short" });
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
  const t = useT();
  const lang = useLang();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [user, setUser] = useState<{ loggedIn: boolean; username: string | null } | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // "@ol" på slutten av teksten = brukeren holder på å tagge noen.
  const mentionQuery = text.match(/@([a-z0-9._]*)$/i)?.[1].toLowerCase() ?? null;

  useEffect(() => {
    fetch(`/api/adverts/${advertId}/comments`)
      .then((res) => (res.ok ? res.json() : { comments: [] }))
      .then((data) => setComments(data.comments || []));
    fetchUser().then((u) => setUser({ loggedIn: u.loggedIn, username: u.username ?? null }));
  }, [advertId]);

  // Forslag mens man tagger: folk i tråden først, så søketreff blant alle brukere.
  useEffect(() => {
    if (mentionQuery === null || mentionQuery.length < 2) return;
    const timer = setTimeout(() => {
      fetch(`/api/user/search?q=${encodeURIComponent(mentionQuery)}`)
        .then((res) => (res.ok ? res.json() : { users: [] }))
        .then((data) => setSearchResults(data.users || []));
    }, 200);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const suggestions =
    mentionQuery === null
      ? []
      : Array.from(new Set([...(comments || []).map((c) => c.username), ...searchResults]))
          .filter((n) => n !== user?.username && n.startsWith(mentionQuery))
          .slice(0, 6);

  function pickMention(name: string) {
    setText((prev) => prev.replace(/@([a-z0-9._]*)$/i, `@${name} `));
    inputRef.current?.focus();
  }

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
      setError(data.error || t("Noe gikk galt, prøv igjen."));
      return;
    }
    const next = [...(comments || []), data.comment as Comment];
    setComments(next);
    onCountChange(next.length);
    setText("");
  }

  async function remove(comment: Comment) {
    if (!confirm(t("Slette kommentaren?"))) return;
    const res = await fetch(`/api/adverts/${advertId}/comments?kommentar=${comment.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert(t("Noe gikk galt, prøv igjen."));
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
        aria-label={t("Kommentarer")}
        style={{ width: "100%", maxWidth: 520, height: "70dvh", display: "flex", flexDirection: "column", backgroundColor: "var(--background)", color: "var(--foreground)", borderRadius: "20px 20px 0 0", boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ width: 32 }} />
          <h2 style={{ flex: 1, margin: 0, textAlign: "center", fontSize: 16, fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>
            {comments
              ? comments.length === 1
                ? t("{antall} kommentar", { antall: comments.length })
                : t("{antall} kommentarer", { antall: comments.length })
              : t("Kommentarer")}
          </h2>
          <button onClick={onClose} aria-label={t("Lukk")} style={{ width: 32, background: "none", border: "none", color: "var(--foreground)", cursor: "pointer", display: "flex", justifyContent: "center", padding: 0 }}>
            <CloseIcon size={22} strokeWidth={2.2} />
          </button>
        </div>

        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
          {comments === null ? (
            <p style={{ opacity: 0.6, textAlign: "center", marginTop: 32 }}>{t("Laster...")}</p>
          ) : comments.length === 0 ? (
            <p style={{ opacity: 0.6, textAlign: "center", marginTop: 32 }}>{t("Ingen kommentarer ennå. Bli den første!")}</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 10, padding: "10px 0" }}>
                <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 999, backgroundColor: avatarColor(c.username), color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14 }}>
                  {c.username[0]?.toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, display: "flex", alignItems: "baseline", gap: 8 }}>
                    <strong style={{ fontSize: 15, fontWeight: 700 }}>{c.username}</strong>
                    <span style={{ fontSize: 12, opacity: 0.5 }}>{timeAgo(c.createdAt, t, lang)}</span>
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 15, lineHeight: 1.4, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                    <CommentText text={c.text} />
                  </p>
                </div>
                {c.canDelete && (
                  <button onClick={() => remove(c)} aria-label={t("Slett kommentar")} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--foreground)", opacity: 0.4, cursor: "pointer", fontSize: 13 }}>
                    {t("Slett")}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px max(12px, env(safe-area-inset-bottom))" }}>
          {user === null ? null : !user.loggedIn ? (
            <p style={{ margin: 0, textAlign: "center" }}>
              <a href={loginHref} style={{ color: "var(--primary)", fontWeight: 600 }}>{t("Logg inn")}</a>
              <span style={{ opacity: 0.7 }}> {t("for å kommentere")}</span>
            </p>
          ) : (
            <>
            {suggestions.length > 0 && (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => pickMention(name)}
                    style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px 6px 6px", borderRadius: 999, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontSize: 14, cursor: "pointer" }}
                  >
                    <span style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: avatarColor(name), color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>
                      {name[0]?.toUpperCase()}
                    </span>
                    {name}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("Legg til en kommentar... (@ for å tagge)")}
                autoCapitalize="sentences"
                maxLength={300}
                style={{ flex: 1, minWidth: 0, padding: "11px 14px", borderRadius: 999, border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontSize: 16 }}
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                style={{ flexShrink: 0, padding: "0 18px", borderRadius: 999, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer", opacity: !text.trim() || sending ? 0.5 : 1 }}
              >
                {sending ? "..." : t("Send")}
              </button>
            </form>
            </>
          )}
          {error && <p style={{ color: "#e05252", fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
