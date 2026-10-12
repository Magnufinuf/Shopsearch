import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";
import { USERNAME_RULES, isValidUsername, normalizeUsername } from "@/lib/username";

// Velg eller endre brukernavn.
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Ikke logget inn." }, { status: 401 });

  const { username: raw } = await request.json();
  const username = normalizeUsername(String(raw || ""));
  if (!isValidUsername(username)) {
    return NextResponse.json({ error: `Ugyldig brukernavn. ${USERNAME_RULES}` }, { status: 400 });
  }

  const { data: taken } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .neq("id", userId)
    .maybeSingle();
  if (taken) return NextResponse.json({ error: `${username} er opptatt.` }, { status: 409 });

  const { error } = await supabase.from("users").update({ username }).eq("id", userId);
  if (error) {
    const isDuplicate = error.code === "23505";
    return NextResponse.json(
      { error: isDuplicate ? `${username} er opptatt.` : "Noe gikk galt, prøv igjen." },
      { status: isDuplicate ? 409 : 500 }
    );
  }

  return NextResponse.json({ success: true, username });
}
