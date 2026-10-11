import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { clearUserCookie, getSessionUserId } from "@/lib/session";

// Sletter kontoen og alt som er lagret (lagrede annonser slettes automatisk via "on delete cascade").
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Ikke logget inn." }, { status: 401 });

  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const response = NextResponse.json({ success: true });
  clearUserCookie(response);
  return response;
}
