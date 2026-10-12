import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionShop, getSessionUserId } from "@/lib/session";
import { escapeHtml, sendEmail } from "@/lib/email";
import { findMentions } from "@/lib/mentions";
import { APP_URL } from "@/lib/app-url";

const MAX_LENGTH = 300;
const MAX_PER_HOUR = 30;
const MAX_MENTIONS = 5;

// Sender e-post til de som ble tagget (@brukernavn) i en kommentar.
async function notifyMentions(text: string, author: string, authorId: string, advertId: string) {
  const names = findMentions(text).filter((n) => n !== author).slice(0, MAX_MENTIONS);
  if (names.length === 0) return;

  const { data: tagged } = await supabase.from("users").select("id, email, username").in("username", names);
  const link = `${APP_URL}/adverts?annonse=${advertId}&kommentarer=1`;

  await Promise.all(
    (tagged || [])
      .filter((u) => u.id !== authorId)
      .map((u) =>
        sendEmail(
          u.email,
          `${author} nevnte deg i en kommentar på Scavenger`,
          `<div style="font-family:Arial,sans-serif;font-size:16px;color:#3A2A1F;line-height:1.5">
            <p><strong>${escapeHtml(author)}</strong> nevnte deg i en kommentar:</p>
            <p style="padding:12px 16px;background:#FBF3EC;border-radius:12px">«${escapeHtml(text)}»</p>
            <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#C1502E;color:white;border-radius:12px;text-decoration:none;font-weight:bold">Se kommentaren</a></p>
          </div>`
        )
      )
  );
}

type CommentRow = {
  id: number;
  text: string;
  created_at: string;
  user_id: string;
  users: { username: string | null } | null;
};

// Alle kommentarer på en annonse, eldste først (som en samtale).
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/adverts/[id]/comments">) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ comments: [] });

  const [userId, shop, { data: advert }] = await Promise.all([
    getSessionUserId(),
    getSessionShop(),
    supabase.from("adverts").select("store_domain").eq("id", id).maybeSingle(),
  ]);

  const { data, error } = await supabase
    .from("advert_comments")
    .select("id, text, created_at, user_id, users (username)")
    .eq("advert_id", id)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Butikken som eier annonsen kan slette kommentarer på den.
  const isAdvertOwner = !!shop && advert?.store_domain === shop;

  return NextResponse.json({
    comments: ((data || []) as unknown as CommentRow[]).map((c) => ({
      id: String(c.id),
      text: c.text,
      createdAt: c.created_at,
      username: c.users?.username ?? "ukjent",
      canDelete: c.user_id === userId || isAdvertOwner,
    })),
  });
}

// Skriv en kommentar.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/adverts/[id]/comments">) {
  const { id } = await ctx.params;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Logg inn for å kommentere." }, { status: 401 });

  const { text: raw } = await request.json();
  const text = String(raw || "").trim().slice(0, MAX_LENGTH);
  if (!text) return NextResponse.json({ error: "Skriv noe først." }, { status: 400 });

  const { data: user } = await supabase.from("users").select("username").eq("id", userId).maybeSingle();
  if (!user) return NextResponse.json({ error: "Logg inn for å kommentere." }, { status: 401 });
  const username = user.username;
  if (!username) {
    return NextResponse.json({ error: "Velg et brukernavn først.", needsUsername: true }, { status: 400 });
  }

  const { count } = await supabase
    .from("advert_comments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if ((count ?? 0) >= MAX_PER_HOUR) {
    return NextResponse.json({ error: "Du har kommentert mye nå. Prøv igjen om litt." }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("advert_comments")
    .insert({ advert_id: id, user_id: userId, text })
    .select("id, created_at")
    .single();
  if (error || !data) {
    console.error("Kunne ikke lagre kommentar:", error?.message);
    return NextResponse.json({ error: "Noe gikk galt, prøv igjen." }, { status: 500 });
  }

  await notifyMentions(text, username, userId, id);

  return NextResponse.json({
    comment: { id: String(data.id), text, createdAt: data.created_at, username, canDelete: true },
  });
}

// Slett en kommentar: den som skrev den, eller butikken som eier annonsen.
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/adverts/[id]/comments">) {
  const { id } = await ctx.params;
  const commentId = request.nextUrl.searchParams.get("kommentar");
  if (!commentId || !/^\d+$/.test(commentId)) return NextResponse.json({ error: "Mangler kommentar." }, { status: 400 });

  const [userId, shop] = await Promise.all([getSessionUserId(), getSessionShop()]);

  const { data: comment } = await supabase
    .from("advert_comments")
    .select("user_id, adverts (store_domain)")
    .eq("id", commentId)
    .eq("advert_id", id)
    .maybeSingle();
  if (!comment) return NextResponse.json({ error: "Fant ikke kommentaren." }, { status: 404 });

  const storeDomain = (comment.adverts as unknown as { store_domain: string } | null)?.store_domain;
  const allowed = (userId && comment.user_id === userId) || (shop && storeDomain === shop);
  if (!allowed) return NextResponse.json({ error: "Du kan ikke slette denne." }, { status: 403 });

  const { error } = await supabase.from("advert_comments").delete().eq("id", commentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
