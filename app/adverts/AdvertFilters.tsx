"use client";

import { Advert } from "@/lib/adverts";
import { CurrencyInfo, convertPrice, formatPrice } from "@/lib/currency";
import { STYLES } from "@/lib/styles";
import { CloseIcon } from "../components/Icons";

export type Filters = {
  price: string | null;
  styles: string[];
  gender: "herre" | "dame" | null;
};

export const NO_FILTERS: Filters = { price: null, styles: [], gender: null };

// Prisklasser i besøkerens valuta.
const PRICE_BUCKETS = [
  { id: "0-300", min: 0, max: 300 },
  { id: "300-700", min: 300, max: 700 },
  { id: "700-1500", min: 700, max: 1500 },
  { id: "1500+", min: 1500, max: Infinity },
];

function whole(amount: number, currency: string): string {
  return formatPrice(amount, currency).replace(/[,.]00(?=\D*$)/, "");
}

export function priceBucketLabel(id: string, currency: string): string {
  const b = PRICE_BUCKETS.find((x) => x.id === id);
  if (!b) return "";
  if (b.min === 0) return `Under ${whole(b.max, currency)}`;
  if (b.max === Infinity) return `Over ${whole(b.min, currency)}`;
  return `${whole(b.min, currency)} – ${whole(b.max, currency)}`;
}

export function activeFilterCount(f: Filters): number {
  return (f.price ? 1 : 0) + f.styles.length + (f.gender ? 1 : 0);
}

export function matchesFilters(a: Advert, f: Filters, info: CurrencyInfo | null): boolean {
  if (activeFilterCount(f) === 0) return true;
  // Pris, stil og kjønn finnes bare på produktannonser.
  if (a.product_price === undefined) return false;
  if (f.price) {
    const b = PRICE_BUCKETS.find((x) => x.id === f.price);
    const price = convertPrice(a.product_price, a.product_currency || "NOK", info);
    if (b && (price < b.min || price >= b.max)) return false;
  }
  if (f.styles.length && !f.styles.some((s) => a.styles?.includes(s))) return false;
  if (f.gender && a.gender !== f.gender && a.gender !== "unisex") return false;
  return true;
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
        border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
        backgroundColor: active ? "var(--primary)" : "transparent",
        color: active ? "white" : "var(--foreground)",
      }}
    >
      {label}
    </button>
  );
}

const heading: React.CSSProperties = { fontSize: 14, fontWeight: 600, margin: "18px 0 10px" };

export default function AdvertFilters({
  adverts,
  filters,
  currency,
  onChange,
  onClose,
  resultCount,
}: {
  adverts: Advert[];
  filters: Filters;
  currency: string;
  onChange: (f: Filters) => void;
  onClose: () => void;
  resultCount: number;
}) {
  // Bare stiler som finnes blant annonsene.
  const usedStyles = new Set(adverts.flatMap((a) => a.styles || []));
  const styles = STYLES.filter((s) => usedStyles.has(s.slug));
  const hasProducts = adverts.some((a) => a.product_price !== undefined);

  const toggleStyle = (slug: string) =>
    onChange({ ...filters, styles: filters.styles.includes(slug) ? filters.styles.filter((s) => s !== slug) : [...filters.styles, slug] });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Filter"
        style={{ width: "100%", maxWidth: 520, maxHeight: "80dvh", overflowY: "auto", backgroundColor: "var(--background)", color: "var(--foreground)", borderRadius: "20px 20px 0 0", padding: "16px 20px 20px", boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button type="button" onClick={() => onChange(NO_FILTERS)} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            Nullstill
          </button>
          <h2 style={{ margin: 0, fontSize: 17, fontFamily: "var(--font-body), sans-serif", fontWeight: 600 }}>Filter</h2>
          <button type="button" onClick={onClose} aria-label="Lukk" style={{ background: "none", border: "none", color: "var(--foreground)", cursor: "pointer", padding: 0, display: "flex" }}>
            <CloseIcon size={22} strokeWidth={2.2} />
          </button>
        </div>

        {!hasProducts ? (
          <p style={{ opacity: 0.65, fontSize: 14, textAlign: "center", margin: "28px 0" }}>
            Pris, stil og kjønn kan velges når butikker legger ut annonser for produkter.
          </p>
        ) : (
          <>
            <p style={heading}>Pris</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PRICE_BUCKETS.map((b) => (
                <Chip
                  key={b.id}
                  label={priceBucketLabel(b.id, currency)}
                  active={filters.price === b.id}
                  onClick={() => onChange({ ...filters, price: filters.price === b.id ? null : b.id })}
                />
              ))}
            </div>

            {styles.length > 0 && (
              <>
                <p style={heading}>Stil</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {styles.map((s) => (
                    <Chip key={s.slug} label={s.label} active={filters.styles.includes(s.slug)} onClick={() => toggleStyle(s.slug)} />
                  ))}
                </div>
              </>
            )}

            <p style={heading}>Kjønn</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Chip label="Herre" active={filters.gender === "herre"} onClick={() => onChange({ ...filters, gender: filters.gender === "herre" ? null : "herre" })} />
              <Chip label="Dame" active={filters.gender === "dame"} onClick={() => onChange({ ...filters, gender: filters.gender === "dame" ? null : "dame" })} />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{ width: "100%", marginTop: 24, padding: "13px 20px", borderRadius: 12, border: "none", backgroundColor: "var(--primary)", color: "white", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
        >
          Vis {resultCount} annonse{resultCount === 1 ? "" : "r"}
        </button>
      </div>
    </div>
  );
}
