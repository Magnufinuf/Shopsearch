"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Advert } from "@/lib/adverts";
import AdvertForm from "../../../adverts/AdvertForm";

export default function RedigerAnnonse() {
  const { id } = useParams<{ id: string }>();
  const [advert, setAdvert] = useState<Advert | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/adverts")
      .then((res) => res.json())
      .then((data) => setAdvert(((data.adverts || []) as Advert[]).find((a) => String(a.id) === id) || null))
      .catch(() => setAdvert(null));
  }, [id]);

  if (advert === undefined) return <p style={{ padding: 24, opacity: 0.6 }}>Laster...</p>;
  if (advert === null) {
    return (
      <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
        <p>Fant ikke annonsen.</p>
        <Link href="/admin/annonser" style={{ color: "var(--primary)" }}>← Tilbake til mine annonser</Link>
      </main>
    );
  }
  return (
    <>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 20px 0" }}>
        <Link href="/admin/annonser" style={{ fontSize: 13, opacity: 0.6 }}>← Tilbake til mine annonser</Link>
      </div>
      <AdvertForm existing={advert} />
    </>
  );
}
