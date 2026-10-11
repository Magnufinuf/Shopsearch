import { NextResponse } from "next/server";
import { clearUserCookie } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearUserCookie(response);
  return response;
}
