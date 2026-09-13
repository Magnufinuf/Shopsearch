"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoggInnBedrift() {
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/verify-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain: domain }),
    });
    const data = await res.json();

    if (data.valid) {
      localStorage.setItem("shopsearch_business_domain", domain);
      router.push("/admin");
    } else {
      setError("Fant ingen registrert butikk med
