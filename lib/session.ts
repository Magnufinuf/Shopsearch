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

// kind skiller butikk- og bruker-innlogging, så en butikk-cookie aldri kan brukes som bruker-cookie.
type Kind = "store" | "user";

function createToken(kind: Kind, subject: string): string {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${kind}.${Buffer.from(subject).toString("base64url")}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(kind: Kind, token: string | undefined): string | null {
  if (!token) return null;
  const [tokenKind, subjectB64, expires, signature] = token.split(".");
  if (tokenKind !== kind || !subjectB64 || !expires || !signature) return null;
  if (!safeEqual(signature, sign(`${tokenKind}.${subjectB64}.${expires}`))) return null;
  if (Date.now() > Number(expires)) return null;
  return Buffer.from(subjectB64, "base64url").toString();
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

// Hvilken butikk er logget inn? null hvis ingen.
export async function getSessionShop(): Promise<string | null> {
  const store = await cookies();
  return readToken("store", store.get(SESSION_COOKIE)?.value);
}

export function setSessionCookie(response: NextResponse, shop: string) {
  response.cookies.set(SESSION_COOKIE, createToken("store", shop), cookieOptions);
}

// --- Vanlige brukere (ikke bedrifter) ---

export const USER_COOKIE = "scavenger_user";

// Id-en til innlogget bruker, eller null.
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return readToken("user", store.get(USER_COOKIE)?.value);
}

export function setUserCookie(response: NextResponse, userId: string) {
  response.cookies.set(USER_COOKIE, createToken("user", userId), cookieOptions);
}

export function clearUserCookie(response: NextResponse) {
  response.cookies.delete(USER_COOKIE);
}

export function hashLoginCode(email: string, code: string): string {
  return sign(`login-code.${email}.${code}`);
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
