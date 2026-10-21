"use client";
// Hvilke produkter innlogget bruker har lagret med hjertet. Delt mellom alle produktkort på siden.
import { useEffect, useSyncExternalStore } from "react";
import { fetchUser } from "./user-client";

export type SavableProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  vendor: string;
  image: string;
  url: string;
  storeDomain?: string;
  shopifyProductId?: string;
};

let saved = new Set<string>();
let loggedIn = false;
let loading: Promise<void> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function changed() {
  version++;
  listeners.forEach((l) => l());
}

function load() {
  if (!loading) {
    loading = fetchUser().then((u) => {
      loggedIn = u.loggedIn;
      saved = new Set(u.savedProductIds || []);
      changed();
    });
  }
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function toggle(product: SavableProduct) {
  await load();
  if (!loggedIn) {
    const here = window.location.pathname + window.location.search;
    window.location.assign(`/logg-inn?neste=${encodeURIComponent(here)}`);
    return;
  }
  const nowSaved = !saved.has(product.id);
  const update = (on: boolean) => {
    saved = new Set(saved);
    if (on) saved.add(product.id);
    else saved.delete(product.id);
    changed();
  };
  update(nowSaved);
  const res = await fetch("/api/user/saved-products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product, saved: nowSaved }),
  }).catch(() => null);
  if (!res?.ok) {
    update(!nowSaved);
    const data = await res?.json().catch(() => ({}));
    alert(data?.error || "Noe gikk galt, prøv igjen.");
  }
}

export function useSavedProducts() {
  useSyncExternalStore(subscribe, () => version, () => 0);
  useEffect(() => {
    load();
  }, []);
  return { isSaved: (id: string) => saved.has(id), toggle };
}

// Brukes når Min side fjerner et produkt fra lista.
export function forgetSavedProduct(id: string) {
  saved = new Set(saved);
  saved.delete(id);
  changed();
}
