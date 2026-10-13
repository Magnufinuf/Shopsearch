import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import ThemeInit from "./components/ThemeInit";
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
  description: "Finn klær, sko og interiør fra mange nettbutikker på ett sted. Bare skriv hva du leter etter.",
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
        <ThemeInit />
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </body>
    </html>
  );
}
