// Domenet e-post sendes fra. Må være verifisert i Resend.
export const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "scavengers.shop";

// Sender e-post via Resend. Returnerer true hvis det gikk.
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Mangler RESEND_API_KEY");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Scavenger <noreply@${EMAIL_DOMAIN}>`, to, subject, html }),
    });
    if (!res.ok) console.error("Resend feilet:", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("Resend feilet:", err);
    return false;
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
