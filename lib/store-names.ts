// Navnet og logoen butikken har valgt, i stedet for den tekniske myshopify-adressen (kun server).
import { supabase } from "./supabase";

export function fallbackStoreName(domain: string): string {
  return domain.replace(".myshopify.com", "");
}

export type StoreProfile = { name: string; logo: string | null };

// select("*") så det virker også før logo-kolonnen finnes (supabase/butikk-logo.sql).
export async function getStoreProfiles(domains: string[]): Promise<Map<string, StoreProfile>> {
  const unique = Array.from(new Set(domains.filter(Boolean)));
  const profiles = new Map<string, StoreProfile>();
  if (unique.length === 0) return profiles;
  const { data } = await supabase.from("stores").select("*").in("store_domain", unique);
  for (const row of data || []) {
    const name = row.display_name?.trim();
    profiles.set(row.store_domain, {
      name: name && name !== fallbackStoreName(row.store_domain) ? name : fallbackStoreName(row.store_domain),
      logo: row.logo_url || null,
    });
  }
  return profiles;
}

export async function getStoreNames(domains: string[]): Promise<Map<string, string>> {
  const profiles = await getStoreProfiles(domains);
  return new Map(Array.from(profiles, ([domain, p]) => [domain, p.name]));
}

export async function getStoreName(domain: string): Promise<string> {
  return (await getStoreNames([domain])).get(domain) || fallbackStoreName(domain);
}
