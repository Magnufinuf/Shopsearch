"use client";

import { useEffect, useState } from "react";

export default function LastOppAdvert() {
  const [domain, setDomain] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("shopsearch_business_domain");
    if (saved) setDomain(saved);
  }, []);

  async function handleUpload() {
    if (!file || !domain) return;
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("storeDomain", domain);
    formData.append("caption", caption);

    const res = await fetch("/api/adverts/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setUploading(false);

    if (data.success) {
      setMessage("Lastet opp! 🎉");
      setFile(null);
      setCaption("");
    } else {
      setMessage("Noe gikk galt: " + (data.error || "ukjent feil"));
    }
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

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          padding: "10px 20px",
          borderRadius: 8,
          backgroundColor: "var(--primary)",
          color: "white",
          border: "none",
        }}
      >
        {uploading ? "Laster opp..." : "Last opp"}
      </button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  );
}
