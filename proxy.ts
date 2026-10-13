import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Gamle og alternative adresser sendes til scavengers.shop, så innloggingen
// alltid lagres på samme adresse og du slipper å logge inn på nytt.
const MAIN_HOST = "scavengers.shop";
const OTHER_HOSTS = ["www.scavengers.shop", "shopsearch-gamma.vercel.app"];

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase();
  if (!host || !OTHER_HOSTS.includes(host)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.protocol = "https";
  url.host = MAIN_HOST;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Ikke API-kall (Shopify-innlogging bruker dem) eller filer.
  matcher: ["/((?!api/|_next/|.*\\.[a-z0-9]+$).*)"],
};
