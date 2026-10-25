"use client";
// Sveipemodus: ett produkt om gangen. Høyre = liker, venstre = nei. Scavenger lærer smaken din
// (lagres bare i nettleseren, se lib/taste.ts) og viser mer av det du liker.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CurrencyInfo, convertPrice, fetchCurrencyInfo } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { useSavedProducts } from "@/lib/saved-products";
import { trackClick } from "@/lib/track";
import { CATEGORIES } from "@/lib/categories";
import { STYLES } from "@/lib/styles";
import {
  LikedProduct,
  TasteProduct,
  TasteState,
  applySwipe,
  loadTaste,
  pickNext,
  productFeatures,
  saveTaste,
  toLiked,
  topTaste,
} from "@/lib/taste";
import ProductCard, { withTracking } from "../components/ProductCard";
import { CloseIcon, HeartIcon } from "../components/Icons";
import SwipeCard, { SwipeDir } from "./SwipeCard";

type HistoryEntry = { product: TasteProduct; liked: boolean; prevWeights: Record<string, number> };

const EXIT_MS = 280;
const MAX_UNDO = 30;

// Kortbredde: maks 420px, aldri bredere enn skjermen, og liten nok til at alt får plass i høyden.
const CARD_W = "min(420px, calc(100vw - 32px), calc((var(--page-h) - 270px) * 0.8))";

function tasteLabel(key: string): string {
  const [kind, slug] = key.split(":");
  if (kind === "style") return STYLES.find((s) => s.slug === slug)?.label ?? slug;
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export default function SwipePage() {
  const t = useT();
  const { isSaved, toggle } = useSavedProducts();
  const [catalog, setCatalog] = useState<TasteProduct[] | null>(null);
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo | null>(null);
  const [taste, setTaste] = useState<TasteState>({ weights: {}, seen: [], liked: [] });
  const [current, setCurrent] = useState<TasteProduct | null>(null);
  const [upcoming, setUpcoming] = useState<TasteProduct | null>(null);
  const [exit, setExit] = useState<SwipeDir | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showLiked, setShowLiked] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Egenskapene til hvert produkt regnes ut én gang per katalog/valuta.
  const featureMap = useMemo(
    () =>
      new Map(
        (catalog || []).map((p) => [p.id, productFeatures(p, convertPrice(p.price, p.currency, currencyInfo, p.localPrices))])
      ),
    [catalog, currencyInfo]
  );
  const featuresOf = useCallback(
    (p: TasteProduct) =>
      featureMap.get(p.id) ?? productFeatures(p, convertPrice(p.price, p.currency, currencyInfo, p.localPrices)),
    [featureMap, currencyInfo]
  );

  // Henter produkter, valuta og lagret smak. All state settes i .then, ikke direkte i effekten.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/products")
      .then((res) => res.json())
      .then(async (data) => {
        const all: TasteProduct[] = ((data.products || []) as TasteProduct[]).filter((p) => p.image && p.url);
        const info = await fetchCurrencyInfo(all.map((p) => p.currency));
        if (cancelled) return;
        const saved = loadTaste();
        const feats = (p: TasteProduct) => productFeatures(p, convertPrice(p.price, p.currency, info, p.localPrices));
        const seen = new Set(saved.seen);
        const first = pickNext(all, seen, feats, saved.weights);
        const second = first ? pickNext(all, new Set([...seen, first.id]), feats, saved.weights) : null;
        setCurrencyInfo(info);
        setTaste(saved);
        setCatalog(all);
        setCurrent(first);
        setUpcoming(second);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  const commit = useCallback(
    (product: TasteProduct, liked: boolean) => {
      if (!catalog) return;
      const prevWeights = taste.weights;
      const weights = applySwipe(prevWeights, featuresOf(product), liked);
      const seen = [...taste.seen.filter((id) => id !== product.id), product.id];
      const likedList = liked ? [toLiked(product), ...taste.liked.filter((p) => p.id !== product.id)] : taste.liked;
      const next: TasteState = { weights, seen, liked: likedList };
      saveTaste(next);
      setTaste(next);
      setHistory((h) => [...h.slice(-(MAX_UNDO - 1)), { product, liked, prevWeights }]);
      const newCurrent = upcoming;
      const exclude = new Set(seen);
      if (newCurrent) exclude.add(newCurrent.id);
      setCurrent(newCurrent);
      setUpcoming(newCurrent ? pickNext(catalog, exclude, featuresOf, weights) : null);
      setExit(null);
    },
    [catalog, taste, upcoming, featuresOf]
  );

  const decide = useCallback(
    (dir: SwipeDir) => {
      if (!current || exit) return;
      setExit(dir);
      const product = current;
      exitTimer.current = setTimeout(() => commit(product, dir === "right"), EXIT_MS);
    },
    [current, exit, commit]
  );

  const undo = useCallback(() => {
    if (exit || history.length === 0) return;
    const last = history[history.length - 1];
    const next: TasteState = {
      weights: last.prevWeights,
      seen: taste.seen.filter((id) => id !== last.product.id),
      liked: last.liked ? taste.liked.filter((p) => p.id !== last.product.id) : taste.liked,
    };
    saveTaste(next);
    setTaste(next);
    setHistory(history.slice(0, -1));
    // Kortet som lå øverst blir neste igjen; det forrige «neste» går tilbake i bunken.
    setUpcoming(current);
    setCurrent(last.product);
  }, [exit, history, taste, current]);

  function restart() {
    if (!catalog) return;
    const next: TasteState = { ...taste, seen: [] };
    saveTaste(next);
    setTaste(next);
    setHistory([]);
    const first = pickNext(catalog, new Set(), featuresOf, next.weights);
    setCurrent(first);
    setUpcoming(first ? pickNext(catalog, new Set([first.id]), featuresOf, next.weights) : null);
  }

  function openProduct(p: TasteProduct) {
    if (p.storeDomain) trackClick(p.storeDomain, "swipe", p.shopifyProductId);
    window.open(withTracking(p.url), "_blank", "noopener,noreferrer");
  }

  function removeLiked(id: string) {
    const next: TasteState = { ...taste, liked: taste.liked.filter((p) => p.id !== id) };
    saveTaste(next);
    setTaste(next);
  }

  // Piltaster: venstre = nei, høyre = liker. Backspace / Ctrl+Z = angre.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (showLiked) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        decide("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        decide("right");
      } else if (e.key === "Backspace" || (e.key === "z" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo, showLiked]);

  const tasteKeys = topTaste(taste.weights);
  const likedCount = taste.liked.length;

  const roundButton = (size: number, color: string): React.CSSProperties => ({
    width: size,
    height: size,
    borderRadius: "50%",
    border: "1px solid var(--border)",
    backgroundColor: "var(--background)",
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 3px 10px rgba(0,0,0,0.10)",
    flexShrink: 0,
  });

  return (
    <main
      style={{
        minHeight: "var(--page-h)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 16px 24px",
        boxSizing: "border-box",
        overflowX: "hidden",
        width: "100%",
      }}
    >
      <header style={{ width: "100%", maxWidth: 420, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-heading), Georgia, serif", fontSize: 26, fontWeight: 600 }}>{t("Sveip")}</h1>
        <button
          type="button"
          onClick={() => setShowLiked((v) => !v)}
          aria-pressed={showLiked}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 999,
            border: "1px solid var(--primary)",
            backgroundColor: showLiked ? "var(--primary)" : "transparent",
            color: showLiked ? "#fff" : "var(--primary)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showLiked ? (
            t("← Tilbake til sveiping")
          ) : (
            <>
              <HeartIcon size={16} filled /> {t("Likte ({n})", { n: likedCount })}
            </>
          )}
        </button>
      </header>

      {showLiked ? (
        <section style={{ width: "100%", maxWidth: 900, marginTop: 20 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 600 }}>{t("Produkter du har likt")}</h2>
          <p style={{ margin: "0 0 18px", fontSize: 14, opacity: 0.65 }}>
            {t("Lagres bare på denne enheten. Trykk på hjertet for å lagre et produkt på kontoen din.")}
          </p>
          {likedCount === 0 ? (
            <p style={{ opacity: 0.6 }}>{t("Du har ikke likt noe ennå. Sveip til høyre på det du liker.")}</p>
          ) : (
            <div className="grid w-full grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
              {taste.liked.map((p: LikedProduct) => (
                <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <ProductCard p={p} currencyInfo={currencyInfo} source="swipe" />
                  <button
                    type="button"
                    onClick={() => removeLiked(p.id)}
                    style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "var(--primary)", fontSize: 13, cursor: "pointer" }}
                  >
                    {t("Fjern fra likte")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <p style={{ width: "100%", maxWidth: 420, margin: "6px 0 0", fontSize: 14, opacity: 0.7, lineHeight: 1.4 }}>
            {t("Sveip til høyre på det du liker – Scavenger lærer stilen din.")}
          </p>
          <div style={{ width: "100%", maxWidth: 420, minHeight: 26, marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
            {tasteKeys.length > 0 && (
              <>
                <span style={{ opacity: 0.55 }}>{t("Din stil:")}</span>
                {tasteKeys.map((k) => (
                  <span key={k} style={{ padding: "2px 10px", borderRadius: 999, border: "1px solid var(--border)", fontWeight: 600 }}>
                    {t(tasteLabel(k))}
                  </span>
                ))}
              </>
            )}
          </div>

          {catalog === null ? (
            <p style={{ marginTop: 40, opacity: 0.6 }}>{t("Laster produkter...")}</p>
          ) : catalog.length === 0 ? (
            <div style={{ marginTop: 40, textAlign: "center", maxWidth: 360 }}>
              <p style={{ opacity: 0.7 }}>{t("Fant ingen produkter å vise akkurat nå.")}</p>
              <Link href="/" style={{ color: "var(--primary)", fontSize: 14 }}>
                {t("← Tilbake til forsiden")}
              </Link>
            </div>
          ) : !current ? (
            <div style={{ marginTop: 40, textAlign: "center", maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{t("Du har sett alt!")}</h2>
              <p style={{ margin: 0, opacity: 0.7, fontSize: 14 }}>
                {t("Start på nytt for å se produktene igjen – Scavenger husker hva du liker.")}
              </p>
              <button
                type="button"
                onClick={restart}
                className="rounded-full px-5 py-3 font-medium text-white"
                style={{ backgroundColor: "var(--primary)", border: "none", cursor: "pointer" }}
              >
                {t("Start på nytt")}
              </button>
              {history.length > 0 && (
                <button type="button" onClick={undo} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 14, cursor: "pointer" }}>
                  {t("Angre siste")}
                </button>
              )}
            </div>
          ) : (
            <>
              <div
                style={{
                  position: "relative",
                  width: CARD_W,
                  minWidth: 220,
                  height: `calc(${CARD_W} * 1.25 + 112px)`,
                  minHeight: 380,
                  marginTop: 8,
                }}
              >
                {upcoming && (
                  <SwipeCard
                    key={upcoming.id}
                    product={upcoming}
                    currencyInfo={currencyInfo}
                    active={false}
                    exit={null}
                    onSwipe={() => {}}
                    onOpen={() => {}}
                    saved={false}
                    onToggleSave={() => {}}
                  />
                )}
                <SwipeCard
                  key={current.id}
                  product={current}
                  currencyInfo={currencyInfo}
                  active
                  exit={exit}
                  onSwipe={decide}
                  onOpen={() => openProduct(current)}
                  saved={isSaved(current.id)}
                  onToggleSave={() =>
                    toggle({
                      id: current.id,
                      title: current.title,
                      price: current.price,
                      currency: current.currency,
                      vendor: current.vendor,
                      image: current.image,
                      url: current.url,
                      storeDomain: current.storeDomain,
                      shopifyProductId: current.shopifyProductId,
                    })
                  }
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={undo}
                  disabled={history.length === 0 || !!exit}
                  aria-label={t("Angre")}
                  title={t("Angre")}
                  style={{ ...roundButton(46, "var(--foreground)"), opacity: history.length === 0 ? 0.35 : 1, cursor: history.length === 0 ? "default" : "pointer" }}
                >
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 14 4 9l5-5" />
                    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
                  </svg>
                </button>
                <button type="button" onClick={() => decide("left")} aria-label={t("Nei takk")} title={t("Nei takk")} style={roundButton(64, "#e0475b")}>
                  <CloseIcon size={28} strokeWidth={2.5} />
                </button>
                <button type="button" onClick={() => decide("right")} aria-label={t("Liker")} title={t("Liker")} style={roundButton(64, "#2fb36d")}>
                  <HeartIcon size={28} filled strokeWidth={2} />
                </button>
              </div>
              <p className="hidden md:block" style={{ marginTop: 12, fontSize: 12, opacity: 0.5 }}>
                {t("Tips: bruk piltastene ← og →")}
              </p>
            </>
          )}
        </>
      )}
    </main>
  );
}
