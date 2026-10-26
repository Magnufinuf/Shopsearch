import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STYLE_PAGES, getStylePage } from "@/lib/style-pages";
import { CATEGORIES } from "@/lib/categories";
import StyleProducts from "./StyleProducts";

// Én side per stil (old money, streetwear ...). Teksten skrives på serveren så Google kan lese den.
export function generateStaticParams() {
  return STYLE_PAGES.map((s) => ({ slug: s.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getStylePage((await params).slug);
  if (!page) return { title: "Scavenger" };
  return {
    title: page.metaTitle,
    description: page.description,
    alternates: { canonical: `/stil/${page.slug}` },
    openGraph: { title: page.metaTitle, description: page.description, images: ["/logo.png"] },
  };
}

const chip: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  fontSize: 13,
  color: "var(--foreground)",
  textDecoration: "none",
};

export default async function StilPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = getStylePage((await params).slug);
  if (!page) notFound();

  return (
    <main style={{ padding: "40px 16px 64px", maxWidth: 960, margin: "0 auto" }}>
      <Link href="/" style={{ fontSize: 14, color: "var(--primary)" }}>
        ← Scavenger
      </Link>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 30, fontWeight: 600, margin: "12px 0 12px", lineHeight: 1.2 }}>
        {page.heading}
      </h1>
      {page.intro.map((p) => (
        <p key={p} style={{ margin: "0 0 10px", fontSize: 15, lineHeight: 1.6, opacity: 0.8, maxWidth: 720 }}>
          {p}
        </p>
      ))}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0 28px" }}>
        {page.searches.map((q) => (
          <Link key={q} href={`/?q=${encodeURIComponent(q)}`} style={{ ...chip, borderColor: "var(--primary)", color: "var(--primary)" }}>
            {q}
          </Link>
        ))}
      </div>

      <StyleProducts slug={page.slug} />

      <section style={{ marginTop: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 10px" }}>Flere stiler</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STYLE_PAGES.filter((s) => s.slug !== page.slug).map((s) => (
            <Link key={s.slug} href={`/stil/${s.slug}`} style={chip}>
              {s.heading.split(" fra ")[0]}
            </Link>
          ))}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "24px 0 10px" }}>Kategorier</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/kategori/${c.slug}`} style={chip}>
              {c.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
