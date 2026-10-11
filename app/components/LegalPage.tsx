import Link from "next/link";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main style={{ padding: "48px 24px", maxWidth: 720, margin: "0 auto", lineHeight: 1.65, fontSize: 15 }}>
      <h1 style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 32, fontWeight: 600, marginBottom: 4 }}>{title}</h1>
      <p style={{ opacity: 0.6, fontSize: 13, marginTop: 0, marginBottom: 32 }}>Sist oppdatert {updated}</p>
      {children}
      <p style={{ marginTop: 40, opacity: 0.75 }}>
        Spørsmål? <Link href="/kontakt" style={{ color: "var(--primary)" }}>Kontakt oss</Link>.
      </p>
    </main>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 19, fontWeight: 600, marginTop: 32, marginBottom: 8 }}>{children}</h2>;
}
