// @brukernavn i kommentarer. Delt mellom server og nettleser.
export const MENTION_RE = /@([a-z0-9._]{3,20})/g;

export function findMentions(text: string): string[] {
  const names = Array.from(text.toLowerCase().matchAll(MENTION_RE), (m) => m[1].replace(/\.+$/, ""));
  return Array.from(new Set(names));
}
