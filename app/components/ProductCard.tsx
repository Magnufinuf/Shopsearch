import { CurrencyInfo, priceLabel } from "@/lib/currency";

export type CardProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  vendor: string;
  image: string;
  url: string;
};

// Lenke til produktet hos butikken, merket så salget kan spores tilbake til Scavenger.
export function withTracking(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}ref=shopsearch&utm_source=shopsearch&utm_medium=referral`;
}

export default function ProductCard({ p, currencyInfo, width }: { p: CardProduct; currencyInfo: CurrencyInfo | null; width?: number }) {
  return (
    <a
      href={withTracking(p.url)}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width,
        flexShrink: 0,
        borderRadius: 14,
        border: "1px solid var(--border)",
        padding: 10,
        textAlign: "left",
        color: "var(--foreground)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", backgroundColor: "var(--border)" }}>
        {p.image && <img src={p.image} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {p.title}
      </p>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.55 }}>{p.vendor}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{priceLabel(p.price, p.currency, currencyInfo)}</p>
    </a>
  );
}
