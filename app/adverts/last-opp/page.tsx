"use client";

import { useEffect, useState } from "react";
import { fetchSession } from "@/lib/session-client";
import { ADVERT_CATEGORIES } from "@/lib/adverts";

export default function LastOppAdvert() {
  const [domain, setDomain] = useState("");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSession().then((s) => {
      if (s.shop) setDomain(s.shop);
      setSessionChecked(true);
    });
  }, []);

  async function handleUpload() {
    if (!file || !domain) return;
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);
    formData.append("category", category);

    const res = await fetch("/api/adverts/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setUploading(false);

    if (data.success) {
      setMessage("Lastet opp!");
      setFile(null);
      setCaption("");
      setCategory("");
    } else {
      setMessage("Noe gikk galt: " + (data.error || "ukjent feil"));
    }
  }

  if (!sessionChecked) {
    return <p style={{ padding: 24, opacity: 0.6 }}>Laster...</p>;
  }

  if (!domain) {
    return (
      <main style={{ padding: 24, maxWidth: 500 }}>
        <h1>Last opp advert</h1>
        <p>Du må være logget inn som bedrift for å laste opp.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 500 }}>
      <h1>Last opp advert</h1>
      <p style={{ opacity: 0.7, marginBottom: 16 }}>
        Last opp en video eller et bilde av produktet ditt.
      </p>

      <input
        type="file"
        accept="video/*,image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ marginBottom: 12, display: "block" }}
      />

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Skriv en bildetekst..."
        style={{
          width: "100%",
          padding: 8,
          marginBottom: 12,
          borderRadius: 8,
          border: "1px solid var(--border)",
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
        rows={3}
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 12,
          borderRadius: 8,
          border: "1px solid var(--border)",
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
          fontSize: 15,
        }}
      >
        <option value="" disabled>Velg kategori</option>
        {ADVERT_CATEGORIES.map((c) => (
          <option key={c.slug} value={c.slug}>{c.label}</option>
        ))}
      </select>

      <button
        onClick={handleUpload}
        disabled={!file || !category || uploading}
        style={{
          padding: "10px 20px",
          borderRadius: 8,
          backgroundColor: "var(--primary)",
          color: "white",
          border: "none",
          opacity: !file || !category || uploading ? 0.6 : 1,
        }}
      >
        {uploading ? "Laster opp..." : "Last opp"}
      </button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  );
}
