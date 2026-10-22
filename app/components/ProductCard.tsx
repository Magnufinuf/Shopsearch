"use client";

import { CurrencyInfo, priceLabel } from "@/lib/currency";
import { ClickSource, trackClick } from "@/lib/track";
import { useSavedProducts } from "@/lib/saved-products";
import { HeartIcon } from "./Icons";
import { useT } from "@/lib/i18n";

export type CardProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  vendor: string;
  image: string;
  url: string;
  storeDomain?: string;
  shopifyProductId?: string;
  createdAt?: string;
};

const NEW_DAYS = 14;

function isNew(createdAt?: string): boolean {
  if (!createdAt) return false;
  const age = Date.now() - new Date(createdAt).getTime();
  return age >= 0 && age < NEW_DAYS * 24 * 60 * 60 * 1000;
}

// Lenke til produktet hos butikken, merket så salget kan spores tilbake til Scavenger.
export function withTracking(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}ref=shopsearch&utm_source=shopsearch&utm_medium=referral`;
}

export default function ProductCard({
  p,
  currencyInfo,
  width,
  source = "sok",
}: {
  p: CardProduct;
  currencyInfo: CurrencyInfo | null;
  width?: number;
  source?: ClickSource;
}) {
  const t = useT();
  const { isSaved, toggle } = useSavedProducts();
  const saved = isSaved(p.id);
  return (
    // Hjertet ligger ved siden av lenken (ikke inni), så et trykk på det ikke åpner butikken.
    <div style={{ position: "relative", width, flexShrink: 0 }}>
    <a
      href={withTracking(p.url)}
      // Teller besøket for butikkens statistikk (Administrasjon).
      onClick={() => p.storeDomain && trackClick(p.storeDomain, source, p.shopifyProductId)}
      target="_blank"
      rel="noopener noreferrer"
      className="sc-product-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: "100%",
        textAlign: "left",
        color: "var(--foreground)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "4 / 5", borderRadius: 14, overflow: "hidden", backgroundColor: "var(--border)", marginBottom: 6 }}>
        {p.image && <img className="sc-product-img" src={p.image} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        {isNew(p.createdAt) && (
          <span style={{ position: "absolute", top: 8, left: 8, padding: "3px 8px", borderRadius: 999, backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
            {t("NY")}
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.vendor}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {p.title}
      </p>
      <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 700 }}>{priceLabel(p.price, p.currency, currencyInfo)}</p>
    </a>
    <button
      type="button"
      onClick={() =>
        toggle({
          id: p.id,
          title: p.title,
          price: p.price,
          currency: p.currency,
          vendor: p.vendor,
          image: p.image,
          url: p.url,
          storeDomain: p.storeDomain,
          shopifyProductId: p.shopifyProductId,
        })
      }
      aria-label={saved ? t("Fjern fra lagrede") : t("Lagre produktet")}
      aria-pressed={saved}
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        width: 34,
        height: 34,
        borderRadius: "50%",
        border: "none",
        backgroundColor: "rgba(255,255,255,0.92)",
        color: saved ? "#ff3b5c" : "#222",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
      }}
    >
      <HeartIcon size={18} filled={saved} strokeWidth={2} />
    </button>
    </div>
  );
}
