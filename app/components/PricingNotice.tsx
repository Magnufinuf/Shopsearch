// Prisen, vist tydelig der butikker melder seg inn.
export default function PricingNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: compact ? "10px 14px" : "14px 16px",
        fontSize: compact ? 13 : 14,
        lineHeight: 1.5,
        textAlign: "left",
        backgroundColor: "rgba(74,222,128,0.08)",
      }}
    >
      <strong>💚 Gratis i starten.</strong> Når gratisperioden er over, velger dere mellom <strong>4 % av salgene</strong> som kommer fra
      Scavenger eller <strong>299 kr/mnd</strong>. Vi sender e-post <strong>30, 10, 5, 3, 2 og 1 dag før</strong>, og dere kan når som helst koble
      fra.
    </div>
  );
}
