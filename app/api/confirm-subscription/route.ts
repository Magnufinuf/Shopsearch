import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { sessionId } = await request.json();

  if (!sessionId) {
    return NextResponse.json({ error: "Mangler sessionId" }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
    {
      headers: { Authorization: `Bearer ${secretKey}` },
    }
  );
  const session = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: session.error?.message || "Ukjent feil" }, { status: 500 });
  }

  if (session.payment_status !== "paid" || !session.client_reference_id) {
    return NextResponse.json({ error: "Betaling ikke bekreftet" }, { status: 400 });
  }

  const { error } = await supabase
    .from("stores")
