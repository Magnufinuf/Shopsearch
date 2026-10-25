"use client";
// Ett stort produktkort som kan dras til siden (høyre = liker, venstre = nei).
import { useRef, useState } from "react";
import { CurrencyInfo, priceLabel } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { HeartIcon } from "../components/Icons";
import type { TasteProduct } from "@/lib/taste";

export type SwipeDir = "left" | "right";

const THRESHOLD = 100; // px
const FLICK_VELOCITY = 0.5; // px per ms
const TAP_SLOP = 6; // px

function storeLabel(p: TasteProduct): string {
  const store = p.storeDomain ? p.storeDomain.replace(/\.myshopify\.com$/i, "") : "";
  if (!store || store.toLowerCase() === p.vendor.toLowerCase().replace(/\s+/g, "-")) return p.vendor;
  return p.vendor ? `${p.vendor} · ${store}` : store;
}

export default function SwipeCard({
  product,
  currencyInfo,
  active,
  exit,
  onSwipe,
  onOpen,
  saved,
  onToggleSave,
}: {
  product: TasteProduct;
  currencyInfo: CurrencyInfo | null;
  // Bare øverste kort kan dras; kortet under vises litt mindre bak.
  active: boolean;
  exit: SwipeDir | null;
  onSwipe: (dir: SwipeDir) => void;
  onOpen: () => void;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const t = useT();
  const [drag, setDrag] = useState({ dx: 0, dy: 0, dragging: false });
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const last = useRef({ x: 0, time: 0, vx: 0 });
  const moved = useRef(false);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!active || exit || e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    last.current = { x: e.clientX, time: e.timeStamp, vx: 0 };
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ dx: 0, dy: 0, dragging: true });
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) moved.current = true;
    const dt = e.timeStamp - last.current.time;
    if (dt > 0) {
      const vx = (e.clientX - last.current.x) / dt;
      last.current = { x: e.clientX, time: e.timeStamp, vx: last.current.vx * 0.3 + vx * 0.7 };
    }
    setDrag({ dx, dy, dragging: true });
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    const dx = e.clientX - s.x;
    const vx = e.timeStamp - last.current.time < 100 ? last.current.vx : 0;
    setDrag({ dx: 0, dy: 0, dragging: false });
    if (cancelled) return;
    if (dx > THRESHOLD || (vx > FLICK_VELOCITY && dx > 30)) onSwipe("right");
    else if (dx < -THRESHOLD || (vx < -FLICK_VELOCITY && dx < -30)) onSwipe("left");
  }

  // Under utflyging bruker vi retningen, ellers hvor langt kortet er dratt.
  const dx = exit ? (exit === "right" ? 1 : -1) * 600 : drag.dx;
  const dy = exit ? drag.dy : drag.dy * 0.35;
  const rotate = Math.max(-25, Math.min(25, dx * 0.06));
  const likeOpacity = exit === "right" ? 1 : exit ? 0 : Math.min(1, Math.max(0, drag.dx / THRESHOLD));
  const nopeOpacity = exit === "left" ? 1 : exit ? 0 : Math.min(1, Math.max(0, -drag.dx / THRESHOLD));

  const transform = active
    ? exit
      ? `translate(${dx > 0 ? "140%" : "-140%"}, ${dy}px) rotate(${rotate}deg)`
      : `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`
    : "scale(0.95) translateY(10px)";

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e, false)}
      onPointerCancel={(e) => endDrag(e, true)}
      aria-hidden={!active}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: 22,
        overflow: "hidden",
        backgroundColor: "var(--background)",
        border: "1px solid var(--border)",
        boxShadow: active ? "0 10px 30px rgba(0,0,0,0.14)" : "0 4px 14px rgba(0,0,0,0.08)",
        transform,
        transition: drag.dragging ? "none" : "transform 0.3s ease, opacity 0.3s ease",
        opacity: exit ? 0.6 : 1,
        touchAction: "pan-y",
        userSelect: "none",
        cursor: active ? (drag.dragging ? "grabbing" : "grab") : "default",
        zIndex: active ? 2 : 1,
        willChange: "transform",
      }}
    >
      <div
        role={active ? "link" : undefined}
        tabIndex={-1}
        aria-label={active ? t("Åpne {navn} i butikken", { navn: product.title }) : undefined}
        onClick={() => {
          if (active && !exit && !moved.current) onOpen();
        }}
        style={{ position: "relative", flex: "1 1 auto", minHeight: 0, backgroundColor: "var(--border)" }}
      >
        {product.image && (
          <img
            src={product.image}
            alt={product.title}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
          />
        )}
        <span
          style={{
            position: "absolute",
            top: 22,
            left: 18,
            padding: "4px 12px",
            border: "4px solid #2fb36d",
            color: "#2fb36d",
            borderRadius: 10,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 2,
            transform: "rotate(-14deg)",
            opacity: likeOpacity,
            backgroundColor: "rgba(255,255,255,0.75)",
            pointerEvents: "none",
          }}
        >
          {t("LIKER")}
        </span>
        <span
          style={{
            position: "absolute",
            top: 22,
            right: 18,
            padding: "4px 12px",
            border: "4px solid #e0475b",
            color: "#e0475b",
            borderRadius: 10,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 2,
            transform: "rotate(14deg)",
            opacity: nopeOpacity,
            backgroundColor: "rgba(255,255,255,0.75)",
            pointerEvents: "none",
          }}
        >
          {t("NEI")}
        </span>
        {active && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            aria-label={saved ? t("Fjern fra lagrede") : t("Lagre produktet")}
            aria-pressed={saved}
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "none",
              backgroundColor: "rgba(255,255,255,0.92)",
              color: saved ? "#ff3b5c" : "#222",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            }}
          >
            <HeartIcon size={20} filled={saved} />
          </button>
        )}
      </div>
      <div style={{ padding: "12px 16px 14px", display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {storeLabel(product)}
        </p>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {product.title}
        </h2>
        <p style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 700 }}>
          {priceLabel(product.price, product.currency, currencyInfo, product.localPrices)}
        </p>
      </div>
    </div>
  );
}
