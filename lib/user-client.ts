// Vanlige brukere (ikke bedrifter), brukt fra sidene i nettleseren.
export type UserInfo = { loggedIn: boolean; email: string | null; savedIds: string[] };

export async function fetchUser(): Promise<UserInfo> {
  try {
    const res = await fetch("/api/user/me", { cache: "no-store" });
    return (await res.json()) as UserInfo;
  } catch {
    return { loggedIn: false, email: null, savedIds: [] };
  }
}

export async function setSaved(advertId: string, saved: boolean): Promise<boolean> {
  const res = await fetch("/api/user/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ advertId, saved }),
  });
  return res.ok;
}

export async function logoutUser() {
  await fetch("/api/user/logout", { method: "POST" });
  window.location.assign("/");
}
