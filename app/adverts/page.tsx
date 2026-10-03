"use client";

import { useEffect, useRef, useState } from "react";

type Advert = {
  id: string;
  store_domain: string;
  media_url: string;
  media_type: "video" | "image";
  caption: string;
  created_at: string;
};

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: "white", cursor: "pointer" }}>
      <span style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
        {icon}
      </span>
      <span style={{ fontSize: 12, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
        {label}
      </span>
    </button>
  );
}

function AdvertSlide({ advert }: { advert: Advert }) {
  const videoRef = useRef<HTMLVideoElement>(null);

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

  function handleWishlist() {
    alert("Lagt til i ønskelisten (kommer snart som egen funksjon)");
  }

  function handleComments() {
    alert("Kommentarer kommer snart");
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: "Scavenger", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      alert("Lenke kopiert!");
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", scrollSnapAlign: "start", backgroundColor: "black", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {advert.media_type === "video" ? (
        <video ref={videoRef} src={advert.media_url} loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <img src={advert.media_url} alt={advert.caption} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "35%", background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))" }} />

      <div style={{ position: "absolute", left: 16, right: 90, bottom: 24, color: "white" }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>
          {advert.store_domain}
        </p>
        {advert.caption && (
          <p style={{ fontSize: 14, opacity: 0.9 }}>{advert.caption}</p>
        )}
        <a href={`https://${advert.store_domain.replace("myshopify.com", "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 10, padding: "8px 18px", borderRadius: 20, backgroundColor: "var(--primary)", color: "white", fontSize: 14, fontWeight: 600 }}>
          Kjøp
        </a>
      </div>

      <div style={{ position: "absolute", right: 12, bottom: 40, display: "flex", flexDirection: "column", gap: 20 }}>
        <ActionButton icon="♡" label="Ønskeliste" onClick={handleWishlist} />
        <ActionButton icon="💬" label="Kommentarer" onClick={handleComments} />
        <ActionButton icon="↗" label="Del" onClick={handleShare} />
      </div>
    </div>
  );
}

export default function AdvertsPage() {
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/adverts")
      .then((res) => res.json())
      .then((data) => {
        setAdverts(data.adverts || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)" }}>
        <p>Laster annonser...</p>
      </main>
    );
  }

  if (adverts.length === 0) {
    return (
      <main style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)", textAlign: "center", padding: 24 }}>
        <p>Ingen annonser ennå. Bedrifter kan laste opp via administrasjonssiden.</p>
      </main>
    );
  }

  return (
    <main style={{ height: "100vh", overflowY: "scroll", scrollSnapType: "y mandatory" }}>
      {adverts.map((advert) => (
        <AdvertSlide key={advert.id} advert={advert} />
      ))}
    </main>
  );
}
