import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/app-url";
import { CATEGORIES } from "@/lib/categories";
import { STYLE_PAGES } from "@/lib/style-pages";

// Forteller Google hvilke sider som finnes.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: APP_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${APP_URL}/adverts`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/outfit`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${APP_URL}/swipe`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...CATEGORIES.map((c) => ({
      url: `${APP_URL}/kategori/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...STYLE_PAGES.map((s) => ({
      url: `${APP_URL}/stil/${s.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    { url: `${APP_URL}/kontakt`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${APP_URL}/personvern`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${APP_URL}/vilkar`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
