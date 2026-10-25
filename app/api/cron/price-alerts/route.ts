import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAllProducts } from "@/lib/products";
import { escapeHtml, sendEmail } from "@/lib/email";
import { APP_URL } from "@/lib/app-url";
import { formatPrice } from "@/lib/currency";
import { findDrops, type CurrentProduct, type PriceDrop, type SavedRow } from "@/lib/price-alerts";

// Kjøres daglig av Vercel Cron (se vercel.json). Sender e-post når lagrede produkter har blitt billigere.
export const maxDuration = 60;

const PAGE = 1000;

async function loadSavedRows(): Promise<SavedRow[]> {
  const rows: SavedRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("saved_products")
      .select("user_id, product_key, product")
      .order("user_id")
      .order("product_key")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Kunne ikke hente lagrede produkter: ${error.message}`);
    rows.push(...((data || []) as SavedRow[]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

// E-post for brukerne som har prisfall. Mangler kolonnen notify_price_drops (SQL ikke kjørt), er varselet på.
async function loadRecipients(userIds: string[]): Promise<Map<string, string>> {
  const recipients = new Map<string, string>();
  for (let i = 0; i < userIds.length; i += 200) {
    const ids = userIds.slice(i, i + 200);
    let { data, error } = await supabase.from("users").select("id, email, notify_price_drops").in("id", ids);
    if (error) ({ data, error } = await supabase.from("users").select("id, email").in("id", ids));
    if (error) throw new Error(`Kunne ikke hente brukere: ${error.message}`);
    for (const u of (data || []) as { id: string; email: string | null; notify_price_drops?: boolean | null }[]) {
      if (u.email && u.notify_price_drops !== false) recipients.set(u.id, u.email);
    }
  }
  return recipients;
}

function emailHtml(drops: PriceDrop[]): string {
  const items = drops
    .map((d) => {
      const url = /^https:\/\//.test(d.url) ? d.url : APP_URL;
      const image = /^https:\/\//.test(d.image)
        ? `<td style="width:88px;padding:0 12px 0 0;vertical-align:top"><a href="${escapeHtml(url)}"><img src="${escapeHtml(d.image)}" alt="" width="88" style="width:88px;height:88px;object-fit:cover;border-radius:12px;display:block"></a></td>`
        : "";
      return `<tr><td style="padding:12px 0;border-bottom:1px solid #EFE3D8">
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>
          ${image}
          <td style="vertical-align:top">
            <a href="${escapeHtml(url)}" style="color:#3A2A1F;font-weight:bold;text-decoration:none">${escapeHtml(d.title)}</a>
            ${d.store ? `<div style="font-size:13px;color:#8a7a6d">${escapeHtml(d.store)}</div>` : ""}
            <div style="margin-top:4px"><span style="text-decoration:line-through;color:#8a7a6d">${escapeHtml(formatPrice(d.oldPrice, d.currency))}</span>
              <strong style="color:#C1502E;margin-left:8px">${escapeHtml(formatPrice(d.newPrice, d.currency))}</strong></div>
            <div style="margin-top:6px"><a href="${escapeHtml(url)}" style="color:#C1502E;font-size:14px">Se produktet</a></div>
          </td>
        </tr></table>
      </td></tr>`;
    })
    .join("");
  const intro = drops.length === 1 ? "Et produkt du har lagret har blitt billigere:" : `${drops.length} produkter du har lagret har blitt billigere:`;
  return `<div style="font-family:Arial,sans-serif;font-size:16px;color:#3A2A1F;line-height:1.5">
      <p>${intro}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">${items}</table>
      <p><a href="${APP_URL}/min-side" style="display:inline-block;padding:12px 24px;background:#C1502E;color:white;border-radius:12px;text-decoration:none;font-weight:bold">Se lagrede produkter</a></p>
      <p style="font-size:13px;color:#8a7a6d">Vil du ikke ha prisvarsler? Skru dem av under <a href="${APP_URL}/innstillinger" style="color:#8a7a6d">Innstillinger</a>.</p>
    </div>`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Ikke tilgang." }, { status: 401 });
  }

  try {
    const rows = await loadSavedRows();
    const products = (await getAllProducts()) as CurrentProduct[];
    const currentById = new Map(products.map((p) => [p.id, p]));
    const byUser = findDrops(rows, currentById);
    const drops = [...byUser.values()].reduce((n, list) => n + list.length, 0);
    const recipients = await loadRecipients([...byUser.keys()]);

    let emailsSent = 0;
    for (const [userId, list] of byUser) {
      const email = recipients.get(userId);
      if (!email) continue;
      const subject = list.length === 1 ? `Prisfall: ${list[0].title}` : `${list.length} lagrede produkter har blitt billigere`;
      if (!(await sendEmail(email, subject, emailHtml(list)))) continue;
      emailsSent++;
      // Husk prisen vi varslet om, så samme fall ikke varsles igjen.
      await Promise.all(
        list.map(async (d) => {
          const { error } = await supabase
            .from("saved_products")
            .update({ product: { ...d.snapshot, price: d.newPrice } })
            .eq("user_id", userId)
            .eq("product_key", d.productKey);
          if (error) console.error("Kunne ikke oppdatere lagret pris:", error.message);
        })
      );
    }

    return NextResponse.json({ checked: rows.length, drops, emailsSent });
  } catch (err) {
    console.error("Prisvarsel feilet:", err);
    return NextResponse.json({ error: "Prisvarsel feilet." }, { status: 500 });
  }
}
