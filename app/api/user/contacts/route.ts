import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";

// Folk du nylig har sendt til eller fått annonser fra, så du slipper å skrive dem inn på nytt.
// Viser brukernavnet når personen har et, ellers e-posten du selv skrev inn.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ contacts: [] });

  const { data: me } = await supabase.from("users").select("email").eq("id", userId).maybeSingle();
  if (!me) return NextResponse.json({ contacts: [] });

  const [{ data: sent }, { data: received }] = await Promise.all([
    supabase.from("shared_adverts").select("to_email").eq("from_user", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("shared_adverts").select("from_user").eq("to_email", me.email).order("created_at", { ascending: false }).limit(50),
  ]);

  const sentEmails = Array.from(new Set((sent || []).map((s) => s.to_email)));
  const senderIds = Array.from(new Set((received || []).map((r) => r.from_user)));

  const [{ data: byEmail }, { data: byId }] = await Promise.all([
    sentEmails.length
      ? supabase.from("users").select("email, username").in("email", sentEmails)
      : Promise.resolve({ data: [] as { email: string; username: string | null }[] }),
    senderIds.length
      ? supabase.from("users").select("username").in("id", senderIds).not("username", "is", null)
      : Promise.resolve({ data: [] as { username: string | null }[] }),
  ]);

  const usernameFor = new Map((byEmail || []).map((u) => [u.email, u.username]));
  // value = det som sendes til /api/user/send-advert, label = det som vises.
  const contacts: { value: string; label: string }[] = [];
  for (const email of sentEmails) {
    const username = usernameFor.get(email);
    contacts.push(username ? { value: username, label: username } : { value: email, label: email.split("@")[0] });
  }
  for (const u of byId || []) {
    if (u.username) contacts.push({ value: u.username, label: u.username });
  }

  const unique = contacts.filter((c, i) => contacts.findIndex((d) => d.value === c.value) === i);
  return NextResponse.json({ contacts: unique.slice(0, 12) });
}
