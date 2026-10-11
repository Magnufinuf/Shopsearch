import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Serveren bruker den hemmelige nøkkelen når den finnes (SUPABASE_SECRET_KEY i Vercel),
// slik at tabellene kan låses for alle andre med Row Level Security.
const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(url, key, { auth: { persistSession: false } });
