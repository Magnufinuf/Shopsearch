"use client";

import { useEffect, useState } from "react";

type Sales = { source: "shopify" | "woocommerce" | "pixel"; available: boolean; count: number; totalNok: number; commissionNok: number };

const kr = (n: number) => new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK" }).format(n);

const PIXEL_ALL_PAGES = `<script src="https://scavengers.shop/pixel.js" async></script>`;
const PIXEL_THANK_YOU = `<script>
  window.addEventListener("load", function () {
    scavengerPurchase({ orderId: "ORDRENUMMER", amount: TOTALBELØP, currency: "NOK" });
  });
</script>`;

function Code({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <pre style={{ margin: 0, padding: "12px 14px", borderRadius: 10, backgroundColor: "rgba(0,0,0,0.06)", fontSize: 12, overflowX: "auto", whiteSpace: "pre" }}>{text}</pre>
      <button
        onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}
        style={{ position: "absolute", top: 6, right: 6, padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: 12, cursor: "pointer" }}
      >
        {copied ? "Kopiert" : "Kopier"}
      </button>
    </div>
  );
}

// Salg via Scavenger denne måneden, og hva 4 % provisjon blir. Viser kodebiten for butikker som trenger pikselen.
export default function SalesPanel({ isFree, subscribed }: { isFree: boolean; subscribed: boolean | null }) {
  const [sales, setSales] = useState<Sales | null>(null);

  useEffect(() => {
    fetch("/api/admin/sales")
      .then((res) => (res.ok ? res.json() : null))
      .then(setSales)
      .catch(() => setSales(null));
  }, []);

  return (
    <section style={{ border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px", marginBottom: 24 }}>
      <h2 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Salg via Scavenger</h2>
      <p style={{ margin: "0 0 16px", fontSize: 13, opacity: 0.6 }}>Kjøp fra kunder som kom fra Scavenger denne måneden.</p>

      {sales === null ? (
        <p style={{ opacity: 0.6, margin: 0 }}>Laster...</p>
      ) : !sales.available ? (
        <p style={{ opacity: 0.7, margin: 0, fontSize: 14 }}>
          {sales.source === "shopify"
            ? "Salgstall for Shopify-butikker kommer snart."
            : sales.source === "woocommerce"
              ? "Vi fikk ikke lest ordrene. Sjekk at nøkkelen dere koblet til med har lesetilgang."
              : "Salgssporing er ikke klar ennå."}
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, opacity: 0.65 }}>Salg</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{sales.count}</p>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, opacity: 0.65 }}>Omsetning</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{kr(sales.totalNok)}</p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>
            {isFree
              ? `Gratis nå. Etter gratisperioden ville 4 % provisjon blitt ${kr(sales.commissionNok)} for denne måneden.`
              : subscribed
                ? "Dere har fast abonnement, så det er ingen provisjon."
                : `4 % provisjon så langt denne måneden: ${kr(sales.commissionNok)}. Faktura sendes på e-post den 1. i neste måned.`}
          </p>
        </>
      )}

      {sales?.source === "pixel" && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>Slik måler dere salg fra Scavenger</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10, fontSize: 13, lineHeight: 1.5 }}>
            <p style={{ margin: 0 }}>1. Legg denne linjen på alle sider i nettbutikken (ofte under «egen kode», «tracking» eller «header»):</p>
            <Code text={PIXEL_ALL_PAGES} />
            <p style={{ margin: 0 }}>
              2. Legg denne på «takk for kjøpet»-siden. Bytt ut ORDRENUMMER og TOTALBELØP med feltene nettbutikken bruker der (spør utvikleren deres hvis dere er usikre):
            </p>
            <Code text={PIXEL_THANK_YOU} />
          </div>
        </details>
      )}
    </section>
  );
}
