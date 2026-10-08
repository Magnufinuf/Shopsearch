"use client";
import { useState } from "react";

type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  category: string;
  vendor: string;
  tags: string[];
  image: string;
  url: string;
};

function withTracking(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}ref=shopsearch&utm_source=shopsearch&utm_medium=referral`;
}

type PriceFilter = { min?: number; max?: number };

function extractPriceFilter(query: string): { cleanedQuery: string; filter: PriceFilter } {
  let cleaned = query;
  const filter: PriceFilter = {};

  const betweenMatch = cleaned.match(/mellom\s+(\d+)\s*(?:kr)?\s+og\s+(\d+)\s*(?:kr)?/i);
  if (betweenMatch) {
    filter.min = parseInt(betweenMatch[1], 10);
    filter.max =
