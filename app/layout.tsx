import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Shopsearch",
  description: "Don't search. Ask.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="no" className="h-full antialiased">
      <body className="min-h-full flex">
        <Sidebar />
        <div style={{ flex: 1 }}>{children}</div>
      </body>
    </html>
  );
}
