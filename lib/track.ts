// Registrerer at noen trykket seg videre til en butikk. Sendes i bakgrunnen
// (sendBeacon), så det aldri forsinker at butikken åpnes.
export type ClickSource = "forside" | "sok" | "kategori" | "annonse" | "lagret" | "swipe" | "outfit" | "fordeg";

export function trackClick(storeDomain: string, source: ClickSource, productId?: string) {
  try {
    const body = JSON.stringify({ storeDomain, productId, source });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/click", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/click", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // Statistikk skal aldri stoppe brukeren.
  }
}
