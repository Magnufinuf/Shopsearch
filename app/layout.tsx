import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import ThemeInit from "./components/ThemeInit";

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
  title: "Shopsearch",
  description: "Don't search. Ask.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="no" className={`h-full antialiased ${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-full flex">
        <ThemeInit />
        <Sidebar />
        <div style={{ flex: 1 }}>{children}</div>
      </body>
    </html>
  );
}
