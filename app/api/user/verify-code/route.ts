import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashLoginCode, safeEqual, setUserCookie } from "@/lib/session";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const { email: rawEmail, code: rawCode } = await request.json();
  const email = String(rawEmail || "").trim().toLowerCase();
  const code = String(rawCode || "").replace(/\s/g, "");

  const wrong = NextResponse.json({ error: "Feil eller utløpt kode." }, { status: 401 });
  if (!email || !/^\d{6}$/.test(code)) return wrong;

  const { data: row } = await supabase
    .from("login_codes")
    .select("id, code_hash, attempts, expires_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row || new Date(row.expires_at) < new Date() || row.attempts >= MAX_ATTEMPTS) return wrong;

  if (!safeEqual(row.code_hash, hashLoginCode(email, code))) {
    await supabase.from("login_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return wrong;
  }

  await supabase.from("login_codes").delete().eq("email", email);

  const { data: user, error } = await supabase
    .from("users")
    .upsert({ email }, { onConflict: "email" })
    .select("id")
    .single();
  if (error || !user) {
    console.error("Kunne ikke lage bruker:", error?.message);
    return NextResponse.json({ error: "Noe gikk galt, prøv igjen." }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  setUserCookie(response, user.id);
  return response;
}
