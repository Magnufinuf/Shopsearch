"use client";

import Link from "next/link";
import { categorizeProduct, type Product } from "@/lib/categories";
import { CurrencyInfo, priceLabel } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { trackClick } from "@/lib/track";
import { withTracking } from "../components/ProductCard";

type Item = { role: string; product: Product };

// Plassene et komplett antrekk har. Mangler en, vises en tom plass med lenke til kategorien.
const SLOTS = [
  { key: "overdel", label: "Overdel", categories: ["ytterplagg", "topper"], href: "/kategori/topper" },
  { key: "underdel", label: "Underdel", categories: ["underdeler"], href: "/kategori/underdeler" },
  { key: "sko", label: "Sko", categories: ["sko"], href: "/kategori/sko" },
  { key: "tilbehor", label: "Tilbehør", categories: ["tilbehor"], href: "/kategori/tilbehor" },
];

function open(p: Product) {
  if (p.storeDomain) trackClick(p.storeDomain, "outfit", p.shopifyProductId);
}

// «Shop the look»: hovedplagget stort, resten av antrekket i en liste ved siden av, og tomme plasser for det som mangler.
export default function OutfitLook({ items, currencyInfo }: { items: Item[]; currencyInfo: CurrencyInfo | null }) {
  const t = useT();
  const categoryOf = (p: Product) => categorizeProduct({ ...p, tags: p.tags || [] });
  const hero = items.find((i) => ["ytterplagg", "topper"].includes(categoryOf(i.product)) && i.product.image) ?? items.find((i) => i.product.image);
  const missing = SLOTS.filter((s) => !items.some((i) => s.categories.includes(categoryOf(i.product))));

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
      {hero && (
        <a
          href={withTracking(hero.product.url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => open(hero.product)}
          style={{ flex: "1 1 260px", maxWidth: 420, aspectRatio: "4 / 5", borderRadius: 16, overflow: "hidden", backgroundColor: "#fff", display: "block" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero.product.image} alt={hero.product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </a>
      )}

      <ul style={{ flex: "1 1 260px", minWidth: 0, listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((i) => (
          <li key={i.product.id}>
            <a
              href={withTracking(i.product.url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => open(i.product)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 14, border: "1px solid var(--border)", color: "var(--foreground)", textDecoration: "none" }}
            >
              <span style={{ width: 64, height: 80, borderRadius: 10, overflow: "hidden", backgroundColor: "#fff", flexShrink: 0 }}>
                {i.product.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.product.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--primary)" }}>{i.role}</span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.product.title}</span>
                <span style={{ display: "block", fontSize: 12, opacity: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.product.vendor}</span>
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                {priceLabel(i.product.price, i.product.currency, currencyInfo, i.product.localPrices)}
              </span>
            </a>
          </li>
        ))}

        {missing.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 14, border: "1px dashed var(--border)", color: "var(--foreground)", textDecoration: "none", opacity: 0.75 }}
            >
              <span style={{ width: 64, height: 80, borderRadius: 10, border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>+</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>{t(s.label)}</span>
                <span style={{ display: "block", fontSize: 13 }}>{t("Finn noe som passer →")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
