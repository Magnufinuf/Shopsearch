import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function sendNotificationEmail(name: string, email: string, messageText: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Scavenger <noreply@auco.store>",
        to: "magnus.l.fredriksen@icloud.com",
        subject: `Ny melding fra ${name || "noen"} på Scavenger`,
        html: `<p><strong>Navn:</strong> ${name || "Ikke oppgitt"}</p><p><strong>E-post:</strong> ${email}</p><p><strong>Melding:</strong></p><p>${messageText.replace(/\n/g, "<br/>")}</p>`,
      }),
    });
  } catch {
    // Varsling feiler ikke hele innsendingen
  }
}

export async function POST(request: Request) {
  const { name, email, messages } = await request.json();

  if (!email || !messages) {
    return NextResponse.json({ error: "Mangler e-post eller melding" }, { status: 400 });
  }

  const { error } = await supabase.from("messages").insert({
    name: name || "",
    email,
    messages,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await sendNotificationEmail(name, email, messages);

  return NextResponse.json({ success: true });
}
