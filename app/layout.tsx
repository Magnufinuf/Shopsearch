import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import ThemeInit from "./components/ThemeInit";

export const metadata: Metadata = {
  title: "Shopsearch",
  description: "Don't search. Ask.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="no" className="h-full antialiased">
      <body className="min-h-full flex">
        <ThemeInit />
        <Sidebar />
        <div style={{ flex: 1 }}>{children}</div>
      </body>
    </html>
  );
}
