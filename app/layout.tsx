import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import ThemeInit from "./components/ThemeInit";
import LangInit from "./components/LangInit";
import { APP_URL } from "@/lib/app-url";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Scavenger – Don't search. Ask.",
  description: "Scavenger er en norsk søkemotor for klær, sko og interiør fra mange nettbutikker. Bare skriv hva du leter etter.",
  applicationName: "Scavenger",
  // Google Search Console: settes i Vercel (GOOGLE_SITE_VERIFICATION) når nettstedet legges til der.
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
  // Standard forhåndsvisning når noen deler en lenke til Scavenger.
  openGraph: {
    siteName: "Scavenger",
    title: "Scavenger – Don't search. Ask.",
    description: "Finn det du leter etter fra mange nettbutikker på ett sted.",
    images: ["/logo.png"],
    locale: "nb_NO",
    type: "website",
  },
  twitter: { card: "summary" },
  // iPhone: «Legg til på Hjem-skjerm» åpner Scavenger i fullskjerm som en app.
  appleWebApp: { capable: true, title: "Scavenger", statusBarStyle: "default" },
};

// Forteller Google at nettstedet heter Scavenger (vises som navn i søkeresultatene) og hvordan man søker på det.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${APP_URL}/#website`,
      name: "Scavenger",
      alternateName: ["Scavengers", "scavengers.shop"],
      url: APP_URL,
      inLanguage: "nb-NO",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${APP_URL}/?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${APP_URL}/#organization`,
      name: "Scavenger",
      url: APP_URL,
      logo: `${APP_URL}/logo.png`,
      description: "Norsk søkemotor for klær, sko og interiør fra mange nettbutikker.",
    },
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF3EC" },
    { media: "(prefers-color-scheme: dark)", color: "#201812" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="no" className={`h-full antialiased ${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-full flex">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
        <ThemeInit />
        <LangInit />
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </body>
    </html>
  );
}
