// Butikker som har logget inn på denne enheten, så de kan logge inn igjen med ett klikk.
// Lagrer kun domene og navn – aldri hemmeligheter.
export type RememberedAccount = { shop: string; name: string };

const KEY = "scavenger_accounts";

export function getRememberedAccounts(): RememberedAccount[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberAccount(account: RememberedAccount) {
  try {
    const others = getRememberedAccounts().filter((a) => a.shop !== account.shop);
    localStorage.setItem(KEY, JSON.stringify([account, ...others].slice(0, 5)));
  } catch {
    // privat modus o.l. – ikke kritisk
  }
}

export function forgetAccount(shop: string): RememberedAccount[] {
  const remaining = getRememberedAccounts().filter((a) => a.shop !== shop);
  try {
    localStorage.setItem(KEY, JSON.stringify(remaining));
  } catch {}
  return remaining;
}
