import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { to, subject, body, fromName } = await request.json();

  if (!to || !body) {
    return NextResponse.json({ error: "Mangler mottaker eller svar" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Mangler RESEND_API_KEY" }, { status: 500 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName || "Scavenger"} <svar@auco.store>`,
      to,
      subject: subject || "Svar fra Scavenger",
      html: body.replace(/\n/g, "<br/>"),
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.message || "Kunne ikke sende svar" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
