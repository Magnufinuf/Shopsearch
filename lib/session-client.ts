// Brukes av sidene i nettleseren for å finne ut hvilken butikk som er logget inn.
export type SessionInfo = {
  loggedIn: boolean;
  shop: string | null;
  displayName: string | null;
  logoUrl?: string | null;
  logoSupported?: boolean;
  shopifyEnabled: boolean;
  subscribed: boolean;
  free: boolean;
  freeUntil: string | null;
};

export async function fetchSession(): Promise<SessionInfo> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    return (await res.json()) as SessionInfo;
  } catch {
    return { loggedIn: false, shop: null, displayName: null, shopifyEnabled: false, subscribed: false, free: true, freeUntil: null };
  }
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
}
