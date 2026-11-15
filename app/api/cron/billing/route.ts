import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getFreePeriod } from "@/lib/pricing";
import { isShopifyDomain } from "@/lib/woocommerce";
import { COMMISSION_RATE, monthStart, salesForStore, totalInNok } from "@/lib/scavenger-sales";
import { escapeHtml, sendEmail } from "@/lib/email";
import { APP_URL } from "@/lib/app-url";

const REMINDER_DAYS = [30, 10, 5, 3, 2, 1];

// Påminnelse om at gratisperioden snart er over. Returnerer antall e-poster sendt.
async function sendReminders(freeUntil: Date): Promise<{ daysLeft: number; sent: number }> {
  const daysLeft = Math.ceil((freeUntil.getTime() - Date.now()) / 86_400_000);
  if (!REMINDER_DAYS.includes(daysLeft)) return { daysLeft, sent: 0 };
  const { data: stores } = await supabase.from("stores").select("*");
  const date = freeUntil.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Oslo" });
  let sent = 0;
  for (const s of stores || []) {
    if (!s.contact_email) continue;
    const name = escapeHtml(s.display_name || s.store_domain);
    const ok = await sendEmail(
      s.contact_email,
      daysLeft === 1 ? "Gratisperioden på Scavenger slutter i morgen" : `Gratisperioden på Scavenger slutter om ${daysLeft} dager`,
      `<p>Hei ${name}!</p>
       <p>Gratisperioden på Scavenger slutter <strong>${escapeHtml(date)}</strong>${daysLeft === 1 ? " (i morgen)" : ` (om ${daysLeft} dager)`}.</p>
       <p>Etter det betaler dere enten <strong>4 % av salgene</strong> som kommer fra Scavenger, eller <strong>299 kr/mnd</strong> i fast pris.
       Gjør dere ingenting, gjelder 4 %, og faktura sendes på e-post den 1. hver måned.</p>
       <p><a href="${APP_URL}/admin">Velg plan eller se salgene deres i administrasjonen</a></p>
       <p>Vil dere ikke fortsette, kan dere koble fra i administrasjonen før datoen. Da betaler dere ingenting.</p>
       <p>Mvh<br>Magnus, Scavenger</p>`
    );
    if (ok) sent++;
  }
  return { daysLeft, sent };
}

// Kjøres av Vercel Cron hver dag (vercel.json):
// - i gratisperioden: e-post til butikkene 30, 10, 5, 3, 2 og 1 dag før den slutter (LAUNCH_DATE + 3 måneder)
// - den 1. i måneden etter gratisperioden: fakturerer 4 % av forrige måneds salg via Scavenger med Stripe,
//   for butikker som ikke har 299 kr-abonnementet.
// Shopify-butikker faktureres av Shopify (kommer når appen kan lese ordrer), så de hoppes over her.
export const maxDuration = 60;

const MIN_INVOICE_ORE = 1000; // under 10 kr faktureres ikke

async function stripe(path: string, params: Record<string, string>, idempotencyKey?: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path}: ${data.error?.message || res.status}`);
  return data;
}

async function findOrCreateCustomer(email: string, name: string, key: string): Promise<string> {
  const res = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  const found = await res.json();
  if (found.data?.[0]?.id) return found.data[0].id;
  return (await stripe("customers", { email, name }, `${key}-customer`)).id;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 401 });
  }
  const period = getFreePeriod();
  if (period.free) {
    // Uten LAUNCH_DATE er gratisperioden på ubestemt tid: ingen påminnelser.
    if (!period.freeUntil) return NextResponse.json({ skipped: "gratisperiode uten sluttdato" });
    return NextResponse.json({ reminders: await sendReminders(new Date(period.freeUntil)) });
  }
  // Fakturering bare den 1. i måneden.
  if (new Date().getUTCDate() !== 1) return NextResponse.json({ skipped: "fakturerer bare den 1." });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Mangler STRIPE_SECRET_KEY" }, { status: 500 });

  const now = new Date();
  const from = monthStart(now, -1);
  const to = monthStart(now);
  const month = from.toISOString().slice(0, 7); // f.eks. "2027-03"

  const { data: stores, error } = await supabase.from("stores").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const report: { store: string; result: string }[] = [];
  for (const store of stores || []) {
    const domain: string = store.store_domain;
    try {
      if (isShopifyDomain(domain)) {
        report.push({ store: domain, result: "Shopify (faktureres av Shopify)" });
        continue;
      }
      if (store.subscribed) {
        report.push({ store: domain, result: "har 299 kr-abonnement" });
        continue;
      }
      const { data: already } = await supabase.from("commission_invoices").select("id").eq("store_domain", domain).eq("month", month).maybeSingle();
      if (already) {
        report.push({ store: domain, result: "allerede fakturert" });
        continue;
      }

      const sales = await salesForStore(store, from, to);
      if (!sales.available) {
        report.push({ store: domain, result: `fikk ikke lest salg (${sales.source})` });
        continue;
      }
      const totalNok = await totalInNok(sales.sales);
      const commissionOre = Math.round(totalNok * COMMISSION_RATE * 100);
      if (commissionOre < MIN_INVOICE_ORE) {
        report.push({ store: domain, result: `for lite å fakturere (${(commissionOre / 100).toFixed(2)} kr)` });
        continue;
      }
      if (!store.contact_email) {
        report.push({ store: domain, result: `mangler kontakt-e-post (skulle fått ${(commissionOre / 100).toFixed(2)} kr)` });
        continue;
      }

      const key = `scavenger-${domain}-${month}`;
      const customer = await findOrCreateCustomer(store.contact_email, store.display_name || domain, key);
      await stripe(
        "invoiceitems",
        {
          customer,
          amount: String(commissionOre),
          currency: "nok",
          description: `Scavenger: 4 % av ${sales.sales.length} salg (${totalNok.toFixed(2)} kr) i ${month}`,
        },
        `${key}-item`
      );
      const invoice = await stripe(
        "invoices",
        { customer, collection_method: "send_invoice", days_until_due: "14", pending_invoice_items_behavior: "include", auto_advance: "true" },
        `${key}-invoice`
      );
      await stripe(`invoices/${invoice.id}/finalize`, {}, `${key}-finalize`);
      await stripe(`invoices/${invoice.id}/send`, {}, `${key}-send`);
      await supabase.from("commission_invoices").insert({
        store_domain: domain,
        month,
        sales_nok: totalNok,
        commission_nok: commissionOre / 100,
        stripe_invoice_id: invoice.id,
      });
      report.push({ store: domain, result: `fakturert ${(commissionOre / 100).toFixed(2)} kr` });
    } catch (err) {
      console.error(`Fakturering feilet for ${domain}:`, err);
      report.push({ store: domain, result: "feil (se logg)" });
    }
  }
  console.log("Provisjonsfakturering", month, JSON.stringify(report));
  return NextResponse.json({ month, report });
}
