import type { Metadata } from "next";
import { getCategoryBySlug } from "@/lib/categories";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: "Scavenger" };
  return {
    title: `${category.label} – Scavenger`,
    description: `Finn ${category.label.toLowerCase()} fra mange nettbutikker på ett sted.`,
    alternates: { canonical: `/kategori/${category.slug}` },
  };
}

export default function KategoriLayout({ children }: { children: React.ReactNode }) {
  return children;
}
