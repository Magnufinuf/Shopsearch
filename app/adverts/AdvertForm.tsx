"use client";

import { useEffect, useState } from "react";
import { fetchSession } from "@/lib/session-client";
import { ADVERT_CATEGORIES, Advert, STORE_CATEGORY } from "@/lib/adverts";
import { Product, categorizeProduct } from "@/lib/categories";
import { formatPrice } from "@/lib/currency";
import { BagIcon, CheckIcon, SearchIcon } from "../components/Icons";

type Kind = "store" | "product";

const field: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  backgroundColor: "var(--background)",
  color: "var(--foreground)",
  fontSize: 15,
  boxSizing: "border-box",
};

const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, margin: "20px 0 8px" };

function KindOption({ active, title, text, icon, onClick }: { active: boolean; title: string; text: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        textAlign: "left",
        padding: 14,
        borderRadius: 14,
        cursor: "pointer",
        border: active ? "2px solid var(--primary)" : "1px solid var(--border)",
        backgroundColor: "transparent",
        color: "var(--foreground)",
      }}
    >
      <span style={{ display: "flex", color: "var(--primary)", marginBottom: 8 }}>{icon}</span>
      <span style={{ display: "block", fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{title}</span>
      <span style={{ display: "block", fontSize: 12, opacity: 0.65, lineHeight: 1.4 }}>{text}</span>
    </button>
  );
}

const storeIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9.5 5.5 4h13L20 9.5" />
    <path d="M4 9.5c0 1.4 1.1 2.5 2.7 2.5s2.6-1.1 2.6-2.5c0 1.4 1.1 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1 2.5 2.6 2.5S20 10.9 20 9.5" />
    <path d="M5.5 12v8h13v-8M10 20v-4.5h4V20" />
  </svg>
);

// Skjema for å legge ut en ny annonse, eller redigere en eksisterende (existing).
export default function AdvertForm({ existing }: { existing?: Advert }) {
  const editing = !!existing;
  const [domain, setDomain] = useState("");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [kind, setKind] = useState<Kind | null>(existing ? (existing.product_url ? "product" : "store") : null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [query, setQuery] = useState("");
  // Ved redigering vises det lagrede produktet til produktlisten er hentet.
  const [product, setProduct] = useState<Product | null>(
    existing?.product_url
      ? { id: "", title: existing.product_title || existing.product_url, price: existing.product_price ?? 0, currency: existing.product_currency || "NOK", category: "", vendor: "", tags: [], image: "", url: existing.product_url }
      : null
  );
  const [category, setCategory] = useState(existing?.product_url && existing.category ? existing.category : "");
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState(existing?.caption || "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSession().then((s) => {
      if (s.shop) setDomain(s.shop);
      setSessionChecked(true);
    });
  }, []);

  // Produktene til butikken, så man kan velge hvilket annonsen gjelder.
  useEffect(() => {
    if (kind !== "product" || products || !domain) return;
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        const own = ((data.products || []) as Product[]).filter((p) => p.storeDomain === domain);
        setProducts(own);
        // Bytt ut plassholderen med det ekte produktet (med bilde og pris).
        setProduct((current) => (current ? own.find((p) => p.url === current.url) || current : current));
      })
      .catch(() => setProducts([]));
  }, [kind, products, domain]);

  function chooseProduct(p: Product) {
    setProduct(p);
    // Forslag ut fra produktet; butikken kan endre det.
    setCategory(categorizeProduct(p));
  }

  const ready = (editing || !!file) && (kind === "store" || (kind === "product" && !!product && !!category));

  async function handleUpload() {
    if (!ready || !kind) return;
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    if (file) formData.append("file", file);
    if (existing) formData.append("id", String(existing.id));
    formData.append("caption", caption);
    formData.append("kind", kind);
    if (kind === "product" && product) {
      formData.append("category", category);
      formData.append("productUrl", product.url);
      formData.append("productTitle", product.title);
    }

    const res = await fetch(editing ? "/api/adverts/update" : "/api/adverts/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setUploading(false);

    if (data.success && editing) {
      window.location.assign("/admin/annonser");
      return;
    }
    if (data.success) {
      setMessage("Annonsen er lagt ut!");
      setFile(null);
      setCaption("");
      setProduct(null);
      setCategory("");
      setKind(null);
    } else {
      setMessage("Noe gikk galt: " + (data.error || "ukjent feil"));
    }
  }

  if (!sessionChecked) {
    return <p style={{ padding: 24, opacity: 0.6 }}>Laster...</p>;
  }

  if (!domain) {
    return (
      <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
        <h1>{editing ? "Rediger annonse" : "Legg ut annonse"}</h1>
        <p>Du må være logget inn som bedrift for å {editing ? "redigere" : "legge ut"} annonser.</p>
      </main>
    );
  }

  if (existing && existing.store_domain !== domain) {
    return (
      <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
        <p>Du kan bare redigere annonser fra din egen butikk.</p>
      </main>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = (products || []).filter((p) => !q || p.title.toLowerCase().includes(q));

  return (
    <main style={{ padding: "32px 20px 48px", maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 26, fontWeight: 600, marginBottom: 6 }}>{editing ? "Rediger annonse" : "Legg ut annonse"}</h1>
      <p style={{ opacity: 0.65, fontSize: 14, margin: 0 }}>Hva vil du markedsføre?</p>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <KindOption
          active={kind === "store"}
          title="Hele butikken"
          text="Knappen blir «Besøk» og sender folk til forsiden din."
          icon={storeIcon}
          onClick={() => setKind("store")}
        />
        <KindOption
          active={kind === "product"}
          title="Ett produkt"
          text="Knappen blir «Kjøp» og sender folk rett til produktet."
          icon={<BagIcon size={24} />}
          onClick={() => setKind("product")}
        />
      </div>

      {kind === "product" && (
        <>
          <span style={label}>Velg produkt</span>
          {product ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 12, border: "2px solid var(--primary)" }}>
              {product.image && <img src={product.image} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover" }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.title}</p>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.65 }}>{formatPrice(product.price, product.currency)}</p>
              </div>
              <button type="button" onClick={() => setProduct(null)} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Bytt
              </button>
            </div>
          ) : (
            <>
              <div style={{ position: "relative", marginBottom: 8 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5, display: "flex" }}>
                  <SearchIcon size={18} />
                </span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk i produktene dine" style={{ ...field, paddingLeft: 38 }} />
              </div>
              <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
                {products === null ? (
                  <p style={{ padding: 14, margin: 0, opacity: 0.6, fontSize: 14 }}>Henter produkter...</p>
                ) : shown.length === 0 ? (
                  <p style={{ padding: 14, margin: 0, opacity: 0.6, fontSize: 14 }}>Fant ingen produkter.</p>
                ) : (
                  shown.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => chooseProduct(p)}
                      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 10px", background: "none", border: "none", borderBottom: "1px solid var(--border)", color: "var(--foreground)", cursor: "pointer", textAlign: "left" }}
                    >
                      {p.image ? (
                        <img src={p.image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: "var(--border)", flexShrink: 0 }} />
                      )}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                        <span style={{ display: "block", fontSize: 12, opacity: 0.6 }}>{formatPrice(p.price, p.currency)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          <span style={label}>Kategori</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={field}>
            <option value="" disabled>Velg kategori</option>
            {ADVERT_CATEGORIES.filter((c) => c.slug !== STORE_CATEGORY).map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </>
      )}

      {kind && (
        <>
          <span style={label}>{editing ? "Video eller bilde (valgfritt å bytte)" : "Video eller bilde"}</span>
          {editing && existing && !file && (
            <div style={{ width: 96, aspectRatio: "9 / 14", borderRadius: 10, overflow: "hidden", backgroundColor: "black", marginBottom: 8 }}>
              {existing.media_type === "video" ? (
                <video src={existing.media_url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <img src={existing.media_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
          )}
          <label style={{ ...field, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <span style={{ padding: "6px 12px", borderRadius: 8, backgroundColor: "var(--border)", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>Velg fil</span>
            <span style={{ fontSize: 14, opacity: file ? 1 : 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file ? file.name : editing ? "Behold nåværende" : "Ingen fil valgt"}</span>
            {file && <span style={{ color: "var(--primary)", display: "flex", marginLeft: "auto" }}><CheckIcon size={18} /></span>}
            <input type="file" accept="video/*,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
          </label>

          <span style={label}>Tekst</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Skriv noe om annonsen..."
            rows={3}
            style={{ ...field, resize: "vertical" }}
          />

          <button
            onClick={handleUpload}
            disabled={!ready || uploading}
            style={{
              width: "100%",
              marginTop: 20,
              padding: "13px 20px",
              borderRadius: 12,
              backgroundColor: "var(--primary)",
              color: "white",
              border: "none",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              opacity: !ready || uploading ? 0.6 : 1,
            }}
          >
            {uploading ? (editing ? "Lagrer..." : "Legger ut...") : editing ? "Lagre endringer" : "Legg ut annonse"}
          </button>
        </>
      )}

      {message && <p style={{ marginTop: 14, textAlign: "center" }}>{message}</p>}
    </main>
  );
}
