// Brukernavn: 3–20 tegn, små bokstaver, tall, punktum og understrek.
export const USERNAME_RULES = "3–20 tegn: bokstaver a–z, tall, punktum og understrek.";

export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, "").toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9._]{3,20}$/.test(username) && !username.startsWith(".") && !username.endsWith(".");
}
