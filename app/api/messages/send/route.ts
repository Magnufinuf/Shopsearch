import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { name, email, messages } = await request.json();

  if (!email || !messages) {
    return NextResponse.json({ error: "Mangler e-post eller melding" }, { status: 400 });
  }

  const { error } = await supabase.from("messages").insert({
    name: name || "",
    email,
    messages,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
