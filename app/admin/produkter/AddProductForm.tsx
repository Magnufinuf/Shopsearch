"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";

const input: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  color: "var(--foreground)",
  fontSize: 15,
  boxSizing: "border-box",
};

// Legg inn et produkt selv: bilde, navn, pris, lenke og kategori. Som å legge ut en annonse på Finn.
export default function AddProductForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("NOK");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!image) return;
    setSaving(true);
    setError("");
    const form = new FormData();
    form.append("title", title);
    form.append("price", price);
    form.append("currency", currency);
    form.append("url", url);
    form.append("category", category);
    form.append("image", image);
    const res = await fetch("/api/admin/manual-products", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Noe gikk galt, prøv igjen.");
      return;
    }
    setTitle("");
    setPrice("");
    setUrl("");
    setCategory("");
    setImage(null);
    setPreview(null);
    onAdded();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ width: "100%", padding: "14px 16px", borderRadius: 16, border: "1px dashed var(--border)", background: "none", color: "var(--primary)", fontWeight: 600, fontSize: 15, cursor: "pointer", marginBottom: 20 }}
      >
        + Legg inn et produkt selv
      </button>
    );
  }

  const ready = title.trim() && price.trim() && url.trim() && image;
  return (
    <form onSubmit={save} style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 18, marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ margin: 0, fontWeight: 600 }}>Legg inn et produkt</p>
      <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <span style={{ width: 72, height: 90, borderRadius: 10, border: preview ? "1px solid var(--border)" : "2px dashed var(--border)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {preview ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22, opacity: 0.5 }}>+</span>}
        </span>
        <span style={{ color: "var(--primary)", fontWeight: 600, fontSize: 14 }}>{preview ? "Bytt bilde" : "Last opp bilde"}</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setImage(f);
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
          style={{ display: "none" }}
        />
      </label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Navn, f.eks. Svart hoodie" style={input} />
      <div style={{ display: "flex", gap: 8 }}>
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="Pris, f.eks. 599" style={{ ...input, flex: 1 }} />
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ ...input, width: 100 }}>
          {["NOK", "SEK", "DKK", "EUR", "USD", "GBP"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Lenke der kunden kan kjøpe den (https://...)" spellCheck={false} style={input} />
      <select value={category} onChange={(e) => setCategory(e.target.value)} style={input}>
        <option value="">Kategori (valgfritt)</option>
        {CATEGORIES.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label}
          </option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          type="submit"
          disabled={!ready || saving}
          style={{ padding: "11px 20px", borderRadius: 12, backgroundColor: "var(--primary)", color: "white", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: !ready || saving ? 0.6 : 1 }}
        >
          {saving ? "Lagrer..." : "Legg ut"}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--foreground)", opacity: 0.6, fontSize: 14, cursor: "pointer" }}>
          Avbryt
        </button>
      </div>
      {error && <p style={{ color: "#e05252", fontSize: 14, margin: 0 }}>{error}</p>}
    </form>
  );
}
