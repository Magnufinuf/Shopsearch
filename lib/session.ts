// Innlogging for butikker: en signert, httpOnly cookie som sier hvilken butikk som er logget inn.
// Kun for server-kode (API-ruter).
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "scavenger_session";
const SESSION_DAYS = 30;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("Mangler SESSION_SECRET eller ADMIN_PASSWORD");
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

// Sammenligner to strenger uten å lekke hvor like de er via tidsbruk.
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function createToken(shop: string): string {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${Buffer.from(shop).toString("base64url")}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const [shopB64, expires, signature] = token.split(".");
  if (!shopB64 || !expires || !signature) return null;
  if (!safeEqual(signature, sign(`${shopB64}.${expires}`))) return null;
  if (Date.now() > Number(expires)) return null;
  return Buffer.from(shopB64, "base64url").toString();
}

// Hvilken butikk er logget inn? null hvis ingen.
export async function getSessionShop(): Promise<string | null> {
  const store = await cookies();
  return readToken(store.get(SESSION_COOKIE)?.value);
}

export function setSessionCookie(response: NextResponse, shop: string) {
  response.cookies.set(SESSION_COOKIE, createToken(shop), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE);
}

export function notLoggedIn() {
  return NextResponse.json({ error: "Du må logge inn som bedrift." }, { status: 401 });
}

// For Magnus sine egne admin-sider (innboks osv.).
export function isAdminPassword(password: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return !!expected && typeof password === "string" && safeEqual(password, expected);
}
