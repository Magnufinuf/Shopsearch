"use client";

import { useEffect, useState } from "react";

export default function LastOppAdvert() {
  const [domain, setDomain] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("shopsearch_business_domain");
    if (saved) setDomain(saved);
  }, []);

  async function handleUpload() {
    if (!file || !domain) return;
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("storeDomain", domain);
    formData.append("caption", caption);

    const res = await fetch("/api/adverts/upload", {
      method: "POST",
      body: formData,
    });
    const data =
    
