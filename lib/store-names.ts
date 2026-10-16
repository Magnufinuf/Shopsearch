// Visningsnavnet butikken har valgt (Innstillinger), i stedet for den tekniske myshopify-adressen (kun server).
import { supabase } from "./supabase";

export function fallbackStoreName(domain: string): string {
  return domain.replace(".myshopify.com", "");
}

export async function getStoreNames(domains: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(domains.filter(Boolean)));
  const names = new Map<string, string>();
  if (unique.length === 0) return names;
  const { data } = await supabase.from("stores").select("store_domain, display_name").in("store_domain", unique);
  for (const row of data || []) {
    if (row.display_name?.trim()) names.set(row.store_domain, row.display_name.trim());
  }
  return names;
}

export async function getStoreName(domain: string): Promise<string> {
  return (await getStoreNames([domain])).get(domain) || fallbackStoreName(domain);
}
