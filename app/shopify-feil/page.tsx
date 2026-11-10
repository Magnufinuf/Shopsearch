"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

// Vises hvis noe går galt når en Shopify-butikk installerer eller logger inn, i stedet for en rå feilmelding.
const MESSAGES: Record<string, string> = {
  invalid_state: "Innloggingen tok for lang tid eller ble åpnet i en annen fane.",
  invalid_signature: "Vi klarte ikke å bekrefte svaret fra Shopify.",
  token: "Shopify svarte ikke som forventet da vi skulle fullføre tilkoblingen.",
  save: "Vi klarte ikke å lagre butikken akkurat nå.",
  missing_params: "Lenken fra Shopify manglet informasjon.",
  not_configured: "Shopify-tilkoblingen er midlertidig utilgjengelig.",
};

function readParams() {
  const p = new URLSearchParams(window.location.search);
  return JSON.stringify({ kode: p.get("kode") || "", shop: p.get("shop") || "" });
}

export default function ShopifyFeil() {
  const t = useT();
  const raw = useSyncExternalStore(() => () => {}, readParams, () => JSON.stringify({ kode: "", shop: "" }));
  const { kode, shop } = JSON.parse(raw) as { kode: string; shop: string };
  const validShop = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
  const retryHref = validShop ? `/api/auth/start?shop=${encodeURIComponent(shop)}` : "/registrer";

  return (
    <main style={{ minHeight: "var(--page-h)", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" style={{ width: 56, height: 56, objectFit: "contain", margin: "0 auto 14px", display: "block" }} />
        <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 26, fontWeight: 600, margin: "0 0 10px" }}>
          {t("Noe gikk galt med tilkoblingen")}
        </h1>
        <p style={{ margin: "0 0 22px", fontSize: 15, opacity: 0.75, lineHeight: 1.5 }}>
          {t(MESSAGES[kode] || "Noe gikk galt da butikken skulle kobles til Scavenger.")} {t("Prøv igjen, så går det som regel bra.")}
        </p>
        <a
          href={retryHref}
          style={{ display: "inline-block", padding: "13px 24px", borderRadius: 12, backgroundColor: "#5E8E3E", color: "white", fontWeight: 600, fontSize: 15, textDecoration: "none" }}
        >
          {t("Prøv igjen")}
        </a>
        <p style={{ margin: "22px 0 0", fontSize: 13, opacity: 0.6 }}>
          {t("Fortsatt problemer?")}{" "}
          <Link href="/kontakt" style={{ color: "var(--primary)" }}>
            {t("Kontakt oss")}
          </Link>
          {kode && <span style={{ display: "block", marginTop: 6, fontSize: 11 }}>{t("Feilkode: {kode}", { kode })}</span>}
        </p>
      </div>
    </main>
  );
}
