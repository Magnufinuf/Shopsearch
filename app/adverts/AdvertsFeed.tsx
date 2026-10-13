"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ADVERT_CATEGORIES, Advert, advertCategory, advertTargetUrl } from "@/lib/adverts";
import { trackClick } from "@/lib/track";
import { fetchUser, setSaved } from "@/lib/user-client";
import ShareSheet from "../components/ShareSheet";
import CommentsSheet from "../components/CommentsSheet";
import { BagIcon, CommentIcon, HeartIcon, ShareIcon, SoundOffIcon, SoundOnIcon } from "../components/Icons";

const iconShadow = "drop-shadow(0 1px 3px rgba(0,0,0,0.45))";

function ActionButton({
  icon,
  label,
  onClick,
  ariaLabel,
}: {
  icon: React.ReactNode;
  label?: string;
  onClick?: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{ width: 64, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: "white", cursor: "pointer", padding: 0, filter: iconShadow }}
    >
      {icon}
      {label && <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.2 }}>{label}</span>}
    </button>
  );
}

function storeName(domain: string): string {
  return domain.replace(".myshopify.com", "");
}

function AdvertSlide({
  advert,
  saved,
  muted,
  onToggleMute,
  onToggleSave,
  onShare,
  onComments,
}: {
  advert: Advert;
  saved: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onToggleSave: () => void;
  onShare: () => void;
  onComments: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = advert.media_type === "video";
  const isProduct = !!advert.product_url;
  const name = storeName(advert.store_domain);
  const category = ADVERT_CATEGORIES.find((c) => c.slug === advertCategory(advert));

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", scrollSnapAlign: "start", scrollSnapStop: "always", backgroundColor: "black", overflow: "hidden" }}>
      {isVideo ? (
        <video ref={videoRef} src={advert.media_url} loop muted={muted} playsInline onClick={onToggleMute} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} />
      ) : (
        <img src={advert.media_url} alt={advert.caption} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}

      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 120, background: "linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0))", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", background: "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))", pointerEvents: "none" }} />

      <div style={{ position: "absolute", left: 16, right: 84, bottom: 28, color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, textTransform: "uppercase", border: "2px solid rgba(255,255,255,0.9)", flexShrink: 0 }}>
            {name.charAt(0)}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
            {category && <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>{category.label}</p>}
          </div>
          {/* Produktannonse: rett til produktet. Butikkannonse: til forsiden av butikken. */}
          <a
            href={advertTargetUrl(advert)}
            onClick={() => trackClick(advert.store_domain, "annonse")}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, backgroundColor: "white", color: "#111", fontSize: 13, fontWeight: 700, flexShrink: 0 }}
          >
            {isProduct && <BagIcon size={16} strokeWidth={2.2} />}
            {isProduct ? "Kjøp" : "Besøk"}
          </a>
        </div>
        {isProduct && advert.product_title && (
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, opacity: 0.95, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{advert.product_title}</p>
        )}
        {advert.caption && (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, opacity: 0.95, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {advert.caption}
          </p>
        )}
      </div>

      <div style={{ position: "absolute", right: 6, bottom: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <ActionButton
          ariaLabel={saved ? "Fjern fra lagrede" : "Lagre"}
          icon={<span style={{ color: saved ? "#ff3b5c" : "white", display: "flex" }}><HeartIcon size={32} filled={saved} strokeWidth={1.9} /></span>}
          label={saved ? "Lagret" : "Lagre"}
          onClick={onToggleSave}
        />
        <ActionButton
          ariaLabel="Kommentarer"
          icon={<CommentIcon size={31} strokeWidth={1.9} />}
          label={advert.comment_count ? String(advert.comment_count) : "Kommenter"}
          onClick={onComments}
        />
        <ActionButton ariaLabel="Del" icon={<ShareIcon size={30} strokeWidth={1.9} />} label="Del" onClick={onShare} />
        {isVideo && (
          <ActionButton
            ariaLabel={muted ? "Slå på lyd" : "Slå av lyd"}
            icon={muted ? <SoundOffIcon size={26} strokeWidth={1.9} /> : <SoundOnIcon size={26} strokeWidth={1.9} />}
            onClick={onToggleMute}
          />
        )}
      </div>
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: "7px 14px",
        borderRadius: 999,
        border: "none",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        backgroundColor: active ? "white" : "rgba(255,255,255,0.18)",
        color: active ? "#111" : "white",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "background-color 0.15s ease, color 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

export default function AdvertsFeed() {
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState<Advert | null>(null);
  const [commenting, setCommenting] = useState<Advert | null>(null);
  const [category, setCategory] = useState("alle");
  const [muted, setMuted] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ?annonse=ID (fra en delt lenke): vis den annonsen først.
    const sharedId = new URLSearchParams(window.location.search).get("annonse");
    fetch("/api/adverts")
      .then((res) => res.json())
      .then((data) => {
        const all: Advert[] = data.adverts || [];
        const shared = all.find((a) => String(a.id) === sharedId);
        setAdverts(shared ? [shared, ...all.filter((a) => a !== shared)] : all);
        // ?kommentarer=1 (fra «nevnt i en kommentar»-e-post): åpne kommentarene med en gang.
        if (shared && new URLSearchParams(window.location.search).get("kommentarer") === "1") setCommenting(shared);
        setLoading(false);
      });
    fetchUser().then((u) => {
      setLoggedIn(u.loggedIn);
      setSavedIds(new Set(u.savedIds));
    });
  }, []);

  // Bare kategorier som faktisk har annonser vises som knapper.
  const categories = useMemo(() => {
    const used = new Set(adverts.map(advertCategory));
    return ADVERT_CATEGORIES.filter((c) => used.has(c.slug));
  }, [adverts]);

  const visible = category === "alle" ? adverts : adverts.filter((a) => advertCategory(a) === category);

  function chooseCategory(slug: string) {
    setCategory(slug);
    scrollerRef.current?.scrollTo({ top: 0 });
  }

  function requireLogin(advert: Advert): boolean {
    if (loggedIn) return true;
    window.location.assign(`/logg-inn?neste=${encodeURIComponent(`/adverts?annonse=${advert.id}`)}`);
    return false;
  }

  async function toggleSave(advert: Advert) {
    if (!requireLogin(advert)) return;
    const id = String(advert.id);
    const nowSaved = !savedIds.has(id);
    const update = (save: boolean) =>
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (save) next.add(id);
        else next.delete(id);
        return next;
      });
    update(nowSaved);
    if (!(await setSaved(id, nowSaved))) {
      update(!nowSaved);
      alert("Noe gikk galt, prøv igjen.");
    }
  }

  if (loading) {
    return (
      <main style={{ height: "var(--page-h)", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "black", color: "white" }}>
        <p style={{ opacity: 0.7 }}>Laster annonser...</p>
      </main>
    );
  }

  if (adverts.length === 0) {
    return (
      <main style={{ height: "var(--page-h)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)", textAlign: "center", padding: 24 }}>
        <p>Ingen annonser ennå. Bedrifter kan laste opp via administrasjonssiden.</p>
      </main>
    );
  }

  return (
    <main style={{ height: "var(--page-h)", backgroundColor: "black" }}>
      <div style={{ position: "relative", height: "100%", maxWidth: 520, margin: "0 auto" }}>
        {categories.length > 0 && (
          <div className="sc-no-scrollbar" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 5, display: "flex", gap: 8, padding: "14px 16px", overflowX: "auto" }}>
            <CategoryChip label="Alle" active={category === "alle"} onClick={() => chooseCategory("alle")} />
            {categories.map((c) => (
              <CategoryChip key={c.slug} label={c.label} active={category === c.slug} onClick={() => chooseCategory(c.slug)} />
            ))}
          </div>
        )}

        <div ref={scrollerRef} className="sc-no-scrollbar" style={{ height: "100%", overflowY: "scroll", scrollSnapType: "y mandatory" }}>
          {visible.map((advert) => (
            <AdvertSlide
              key={advert.id}
              advert={advert}
              saved={savedIds.has(String(advert.id))}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onToggleSave={() => toggleSave(advert)}
              onShare={() => setSharing(advert)}
              onComments={() => setCommenting(advert)}
            />
          ))}
        </div>
      </div>

      {sharing && <ShareSheet advert={sharing} onClose={() => setSharing(null)} />}
      {commenting && (
        <CommentsSheet
          advertId={String(commenting.id)}
          onClose={() => setCommenting(null)}
          onCountChange={(count) =>
            setAdverts((prev) => prev.map((a) => (a.id === commenting.id ? { ...a, comment_count: count } : a)))
          }
        />
      )}
    </main>
  );
}
