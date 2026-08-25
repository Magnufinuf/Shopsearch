import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopsearch",
  description: "Don't search. Ask.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="no" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
