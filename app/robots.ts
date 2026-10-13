import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/app-url";

// Sier hvilke sider Google får vise, og hvor sitemap ligger.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/min-side", "/innstillinger", "/innboks", "/logg-inn", "/logg-inn-bedrift", "/registrer", "/installer"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
