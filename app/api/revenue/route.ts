import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type Store = {
  store_domain: string;
  client_id: string;
  client_secret: string;
  display_name: string | null;
};

type ShopifyOrder = {
  id: number;
  total_price: string;
  currency: string;
  referring_site: string;
  landing_site: string;
  created_at: string;
};

async function fetchOrdersForStore(store: Store) {
  const token = store.client_secret;
  if (!token) return [];

  try {
    const res = await fetch(
      `https://${store.store_domain}/admin/api/2024-10/orders.json?status=any&limit=250`,
      {
        headers: { "X-Shopify-Access-Token": token },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const orders = (data.orders as ShopifyOrder[]) || [];

    return orders.filter((o) => {
      const text = `${o.referring_site || ""} ${o.landing_site || ""}`.toLowerCase();
      return text.includes("shopsearch");
    });
  } catch {
    return [];
  }
}

export async function GET() {
  const { data: stores, error } = await supabase
    .from("stores")
    .select("store_domain, client_id, client_secret, display_name");

  if (error || !stores || stores.length === 0) {
    return NextResponse.json({ stores: [] });
  }

  const results = await Promise.all(
    (stores as Store[]).map(async (store) => {
      const orders = await fetchOrdersForStore(store);
      const totalSales = orders.reduce((sum, o) => sum + parseFloat(o.total_price), 0);
      const commission = totalSales * 0.04;

      return {
        store: store.display_name || store.store_domain,
        orderCount: orders.length,
        totalSales: Math.round(totalSales * 100) / 100,
        commission: Math.round(commission * 100) / 100,
        currency: orders[0]?.currency || "USD",
      };
    })
  );

  return NextResponse.json({ stores: results });
}
