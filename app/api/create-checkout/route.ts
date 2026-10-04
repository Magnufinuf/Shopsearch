import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const SALES_LIMIT = 300;

type ShopifyOrder = {
  id: number;
  referring_site: string;
  landing_site: string;
  created_at: string;
};

async function countScavengerSalesThisMonth(storeDomain: string, accessToken: string) {
  if (!accessToken) return 0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  try {
    const res = await fetch(
      `https://${storeDomain}/admin/api/2024-10/orders.json?status=any&limit=250&created_at_min=${startOfMonth}`,
      {
        headers: { "X-Shopify-Access-Token": accessToken },
        cache: "no-store",
      }
    );
    if (!res.ok) return 0;

    const data = await res.json();
    const orders = (data.orders as ShopifyOrder[]) || [];

    return orders.filter((o) => {
      const text = `${o.referring_site || ""} ${o.landing_site || ""}`.toLowerCase();
      return text.includes("shopsearch");
    }).length;
  } catch {
    return 0;
  }
}

export async function POST(request: Request) {
  const { storeDomain } = await request.json();

  if (!storeDomain) {
    return NextResponse.json({ error: "Mangler storeDomain" }, { status: 400 });
  }

  const { data: store } = await supabase
    .from("stores")
    .select("client_secret")
    .eq("store_domain", storeDomain)
    .single();

  const salesThisMonth = await countScavengerSalesThisMonth(storeDomain, store?.client_secret || "");

  if (salesThisMonth >= SALES_LIMIT) {
    return NextResponse.json(
      { error: `Dere har ${salesThisMonth} salg via Scavenger denne måneden. Over ${SALES_LIMIT} salg må dere bruke 4% provisjon i stedet for fast abonnement.` },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const priceId = process.env.STRIPE_PRICE_ID;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  const params = new URLSearchParams();
  params.append("mode", "subscription");
  params.append("line_items[0][price]", priceId!);
  params.append("line_items[0][quantity]", "1");
  params.append(
    "success_url",
    `${appUrl}/admin?abonnement=suksess&session_id={CHECKOUT_SESSION_ID}`
  );
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
