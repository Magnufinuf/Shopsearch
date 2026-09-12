"use client";

import { useState } from "react";

type Product = {
  id: string;
  title: string;
  image: string;
  storeDomain: string;
  shopifyProductId: string;
};

export default function AdminPage() {
  const [domain, setDomain] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProducts() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/products");
    const data = await res.json();
    const mine = (data.products || []).filter(
      (p: Product) => p.storeDomain === domain
    );
    setProducts(mine);
    setLoading(false);
    if (mine.length === 0) {
      setMessage("Fant ingen produkter for denne butikken.");
    }
  }

  async function hideProduct(shopifyProductId: string) {
    await fetch("/api/admin/hide-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: domain, productId: shopifyProductId }),
    });
    setProducts((prev) =>
