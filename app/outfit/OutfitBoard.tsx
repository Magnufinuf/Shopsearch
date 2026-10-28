"use client";

import { categorizeProduct, type Product } from "@/lib/categories";
import { useT } from "@/lib/i18n";

// Outfit-tavle: plaggene satt sammen som en kropp (overdel, bukse, sko), med tilbehør ved siden av.
// Bruker de ekte produktbildene. Hvit bakgrunn på bildene «forsvinner» med mix-blend-mode: multiply.

const BOARD_BG = "#F4EEE6"; // alltid lys, også i mørk modus, så multiply virker

// zoom: produktbilder har ofte mye luft rundt plagget, så plaggene på kroppen forstørres litt.
function Piece({ product, flex, zoom = 1 }: { product: Product; flex: number; zoom?: number }) {
  return (
    <div style={{ flex, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.image}
        alt={product.title}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "multiply", transform: `scale(${zoom})` }}
      />
    </div>
  );
}

export default function OutfitBoard({ products }: { products: Product[] }) {
  const t = useT();
  const withImage = products.filter((p) => p.image);
  if (withImage.length < 2) return null;

  const bySlot = (slug: string) => withImage.filter((p) => categorizeProduct({ ...p, tags: p.tags || [] }) === slug);
  const outer = bySlot("ytterplagg");
  const tops = bySlot("topper");
  const bottoms = bySlot("underdeler");
  const shoes = bySlot("sko");

  // Midten: én overdel (jakke/genser først), én underdel og ett par sko. Resten havner ved siden av.
  const upper = outer[0] ?? tops[0];
  const lower = bottoms[0];
  const feet = shoes[0];
  const body = [upper, lower, feet].filter(Boolean) as Product[];
  // Bare overdeler (f.eks. hoodie + t-skjorte) blir ikke en kropp: da vises ingen tavle.
  if (body.length < 2) return null;
  const extras = withImage.filter((p) => !body.includes(p)).slice(0, 3);

  return (
    <figure
      aria-label={t("Outfit-tavle")}
      style={{
        margin: 0,
        width: "min(340px, 100%)",
        aspectRatio: "3 / 4",
        backgroundColor: BOARD_BG,
        borderRadius: 16,
        padding: 14,
        boxSizing: "border-box",
        display: "flex",
        gap: 8,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {upper && <Piece product={upper} flex={4} zoom={1.15} />}
        {lower && <Piece product={lower} flex={4} zoom={1.15} />}
        {feet && <Piece product={feet} flex={2} zoom={1.1} />}
      </div>
      {extras.length > 0 && (
        <div style={{ width: "34%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
          {extras.map((p) => (
            <Piece key={p.id} product={p} flex={1} />
          ))}
        </div>
      )}
    </figure>
  );
}
