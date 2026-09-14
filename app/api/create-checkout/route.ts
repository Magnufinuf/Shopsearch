import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { storeDomain } = await request.json();

  if (!storeDomain) {
    return NextResponse.json({ error: "Mangler storeDomain" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const priceId = process.env.STRIPE_PRICE_ID;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  const params = new URLSearchParams();
  params.append("mode", "subscription");
  params.append("line_items[0][price]", priceId!);
  params.append("line_items[0][quantity]", "1");
  params.append("success_url", `${appUrl}/admin?abonnement=suksess`);
  params.append("cancel_url", `${appUrl}/admin`);
  params.append("client_reference_id", storeDomain);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const session = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: session.error?.message || "Ukjent feil" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
