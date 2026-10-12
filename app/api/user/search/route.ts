import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";
import { normalizeUsername } from "@/lib/username";

// Søk etter andre brukere på brukernavn (starter med ...). Kun for innloggede.
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ users: [] }, { status: 401 });

  const q = normalizeUsername(request.nextUrl.searchParams.get("q") || "").replace(/[^a-z0-9._]/g, "");
  if (q.length < 2) return NextResponse.json({ users: [] });

  const { data } = await supabase
    .from("users")
    .select("username")
    .like("username", `${q.replace(/_/g, "\\_")}%`)
    .neq("id", userId)
    .order("username")
    .limit(8);

  return NextResponse.json({ users: (data || []).map((u) => u.username).filter(Boolean) });
}
